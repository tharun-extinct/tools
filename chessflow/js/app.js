/*************************************************************************
 * 4. APPLICATION STATE & STORAGE MANAGEMENT
 *************************************************************************/
const STORAGE_KEY = 'chessflow_repertoire_v1';
const STATS_KEY = 'chessflow_stats_v1';

const state = {
  currentView: document.body.dataset.page, // 'home' | 'studio'
  sidebarTab: 'coach', // 'coach' | 'library' | 'save' | 'settings'
  mode: 'drill', // 'drill' | 'record' | 'spar'
  repertoire: [],
  activeSeqId: 'italian-gambit-main',
  filterCategory: 'all',
  searchQuery: '',
  boardFlipped: false,
  boardTheme: 'classic',
  showGuideArrow: true,
  autoPlayOpponent: true,
  aiDepth: 2,

  // Live game history
  engine: new ChessEngine(),
  moveHistory: [], // [{ san, from, to, fenAfter, note, piece, captured }]
  currentPly: 0,
  customNotes: {},

  // Interaction state
  selectedSquare: null,
  legalMovesFromSelected: [],
  pendingPromotion: null,
  cursorSquare: { r: 6, c: 4 },
  opponentTimer: null,

  // Telemetry
  stats: {
    attempts: 0,
    correct: 0,
    streak: 0,
    completed: 0
  }
};

const sound = new SoundFX();

function loadSavedState() {
  try {
    const rawRep = localStorage.getItem(STORAGE_KEY);
    if (rawRep) {
      const parsed = JSON.parse(rawRep);
      if (Array.isArray(parsed) && parsed.length > 0) {
        state.repertoire = parsed;
      } else {
        state.repertoire = JSON.parse(JSON.stringify(DEFAULT_REPERTOIRE));
      }
    } else {
      state.repertoire = JSON.parse(JSON.stringify(DEFAULT_REPERTOIRE));
    }
  } catch (e) {
    state.repertoire = JSON.parse(JSON.stringify(DEFAULT_REPERTOIRE));
  }

  try {
    const rawStats = localStorage.getItem(STATS_KEY);
    if (rawStats) {
      state.stats = Object.assign(state.stats, JSON.parse(rawStats));
    }
  } catch (e) {
    // Ignore storage restrictions
  }
}

function persistRepertoire() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.repertoire));
  } catch (e) {
    // Fallback in-memory
  }
  updateSavedCountBadge();
}

function persistStats() {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(state.stats));
  } catch (e) {}
  renderTelemetry();
}

function getActiveSequence() {
  return state.repertoire.find(item => item.id === state.activeSeqId) || state.repertoire[0];
}

/*************************************************************************
 * 6. DRILL PRACTICE, SEQUENCE RECORDING & AI SPARRING FLOWS
 *************************************************************************/
function clearOpponentTimer() {
  if (state.opponentTimer) {
    clearTimeout(state.opponentTimer);
    state.opponentTimer = null;
  }
}

function selectSequence(seqId) {
  clearOpponentTimer();
  state.activeSeqId = seqId;
  pageDraft = {};
  const seq = getActiveSequence();
  if (!seq) return;

  state.boardFlipped = seq.side === 'b';
  state.engine = new ChessEngine(START_FEN);
  state.moveHistory = [];
  state.currentPly = 0;
  state.selectedSquare = null;
  state.legalMovesFromSelected = [];
  state.customNotes = Object.assign({}, seq.notes || {});

  const titleInput = document.getElementById('saveSequenceTitleInput');
  const sideInput = document.getElementById('saveSequenceSideSelect');
  if (titleInput) titleInput.value = seq.title;
  if (sideInput) sideInput.value = seq.side || 'w';

  if (state.mode === 'record') {
    // In Record Mode, load the full sequence so the user can inspect or append to it
    loadFullSequenceIntoHistory(seq);
  } else {
    setCoachMessage(
      `Loaded <strong>${escapeHtml(seq.title)}</strong> (${seq.side === 'w' ? 'White' : 'Black'} perspective). ${
        seq.notes && seq.notes[0] ? escapeHtml(seq.notes[0]) : 'Make the next book move on the board!'
      }`,
      'info'
    );
    maybeTriggerOpponentAutoMove();
  }

  renderAll();
}

function loadFullSequenceIntoHistory(seq) {
  state.engine = new ChessEngine(START_FEN);
  state.moveHistory = [];
  for (let i = 0; i < seq.moves.length; i++) {
    const m = state.engine.makeMoveBySan(seq.moves[i]);
    if (!m) break;
    state.moveHistory.push({
      san: m.san,
      from: m.from,
      to: m.to,
      fenAfter: state.engine.toFen(),
      note: (seq.notes && seq.notes[i]) || ''
    });
  }
  state.currentPly = state.moveHistory.length;
}

function attemptBoardMove(fromR, fromC, toR, toC, promoPiece = null) {
  const legal = state.engine.getLegalMoves();
  const candidates = legal.filter(
    m => m.from.r === fromR && m.from.c === fromC && m.to.r === toR && m.to.c === toC
  );
  if (candidates.length === 0) return false;

  // Check if promotion choice is needed
  if (candidates[0].promotion && !promoPiece) {
    state.pendingPromotion = { fromR, fromC, toR, toC };
    document.getElementById('promotionOverlay').classList.remove('hidden');
    return false;
  }

  const chosenMove = promoPiece
    ? candidates.find(m => m.promotion === promoPiece) || candidates[0]
    : candidates[0];

  // In Drill Practice Mode, verify against the active sequence's book move!
  if (state.mode === 'drill') {
    const seq = getActiveSequence();
    if (seq && state.currentPly < seq.moves.length) {
      const expectedSan = seq.moves[state.currentPly];
      const isMatch =
        chosenMove.san.replace(/[+#!?]+$/g, '') === expectedSan.replace(/[+#!?]+$/g, '') ||
        chosenMove.san === expectedSan;

      state.stats.attempts++;
      if (!isMatch) {
        state.stats.streak = 0;
        persistStats();
        sound.playError();
        setCoachMessage(
          `Not quite! You played <strong>${chosenMove.san}</strong>, but the book move in <em>${escapeHtml(seq.title)}</em> is <strong>${expectedSan}</strong>. Try again or click <strong>Hint</strong>!`,
          'warn'
        );
        state.selectedSquare = null;
        state.legalMovesFromSelected = [];
        drawChessBoard();
        return false;
      } else {
        state.stats.correct++;
        state.stats.streak++;
        persistStats();
      }
    }
  }

  executeValidatedMove(chosenMove);
  return true;
}

function animatePieceGlide(moveObj) {
  if (state.animFrameId) {
    cancelAnimationFrame(state.animFrameId);
    state.animFrameId = null;
  }
  const duration = 340;
  const start = performance.now();
  const movedPiece = moveObj.promotion
    ? { type: moveObj.promotion, color: moveObj.piece.color }
    : { type: moveObj.piece.type, color: moveObj.piece.color };

  state.activeAnimation = {
    piece: movedPiece,
    from: moveObj.from,
    to: moveObj.to,
    progress: 0
  };

  function step(now) {
    if (!state.activeAnimation) return;
    const elapsed = now - start;
    const t = Math.min(1, elapsed / duration);
    // Smooth cubic ease-out
    state.activeAnimation.progress = 1 - Math.pow(1 - t, 3);
    drawChessBoard();
    if (t < 1) {
      state.animFrameId = requestAnimationFrame(step);
    } else {
      state.activeAnimation = null;
      state.animFrameId = null;
      drawChessBoard();
    }
  }
  state.animFrameId = requestAnimationFrame(step);
}

function executeValidatedMove(moveObj) {
  clearOpponentTimer();
  // If we stepped back earlier, truncate future history before pushing new move
  if (state.currentPly < state.moveHistory.length) {
    state.moveHistory = state.moveHistory.slice(0, state.currentPly);
  }

  state.engine.applyMoveUnchecked(moveObj);
  const isCheck = state.engine.inCheck(state.engine.turn);
  sound.playMove(!!moveObj.captured, isCheck);

  const seq = getActiveSequence();
  const plyIndex = state.currentPly;
  const noteText =
    state.customNotes[plyIndex] ||
    (seq && seq.notes && seq.notes[plyIndex]) ||
    '';

  state.moveHistory.push({
    san: moveObj.san,
    from: moveObj.from,
    to: moveObj.to,
    fenAfter: state.engine.toFen(),
    note: noteText
  });
  state.currentPly = state.moveHistory.length;
  state.selectedSquare = null;
  state.legalMovesFromSelected = [];

  animatePieceGlide(moveObj);

  // Update coach commentary
  if (state.mode === 'drill' && seq) {
    if (state.currentPly >= seq.moves.length) {
      state.stats.completed++;
      persistStats();
      sound.playSuccess();
      setCoachMessage(
        `🎉 <strong>Sequence Completed!</strong> You mastered all ${seq.moves.length} plies of <em>${escapeHtml(seq.title)}</em>! Click <strong>Restart</strong> to drill again or switch to <strong>Free Play / AI</strong> to continue the game.`,
        'success'
      );
    } else {
      const noteMsg = noteText
        ? `<strong>${moveObj.san}:</strong> ${escapeHtml(noteText)}`
        : `Good move (<strong>${moveObj.san}</strong>)! Keep going through the book line.`;
      setCoachMessage(noteMsg, 'info');
      maybeTriggerOpponentAutoMove();
    }
  } else if (state.mode === 'record') {
    setCoachMessage(
      `Recorded <strong>${moveObj.san}</strong> (ply ${state.currentPly}). Add a coaching note below or click <strong>Save to Library / Save to File Manager</strong> anytime.`,
      'info'
    );
  } else if (state.mode === 'spar') {
    maybeTriggerAiSparMove();
  }

  renderAll();
}

function maybeTriggerOpponentAutoMove() {
  if (state.currentView !== 'studio' || state.mode !== 'drill' || !state.autoPlayOpponent) return;
  const seq = getActiveSequence();
  if (!seq || state.currentPly >= seq.moves.length) return;

  const isOpponentTurn = state.engine.turn !== seq.side;
  if (!isOpponentTurn) return;

  clearOpponentTimer();
  const pill = document.getElementById('turnStatusPill');
  if (pill) {
    pill.textContent = `Opponent playing book move...`;
  }
  state.opponentTimer = setTimeout(() => {
    const expectedSan = seq.moves[state.currentPly];
    const legal = state.engine.getLegalMoves();
    const bookMove = legal.find(
      m => m.san.replace(/[+#!?]+$/g, '') === expectedSan.replace(/[+#!?]+$/g, '') || m.san === expectedSan
    );
    if (bookMove) {
      executeValidatedMove(bookMove);
    }
  }, 1150);
}

function maybeTriggerAiSparMove() {
  if (state.currentView !== 'studio' || state.mode !== 'spar') return;
  const seq = getActiveSequence();
  const playerSide = seq ? seq.side : 'w';
  if (state.engine.turn === playerSide) return;

  clearOpponentTimer();
  const pill = document.getElementById('turnStatusPill');
  if (pill) {
    pill.textContent = `Bot thinking...`;
  }
  state.opponentTimer = setTimeout(() => {
    const bestMove = pickAiMove(state.engine, state.aiDepth);
    if (bestMove) {
      executeValidatedMove(bestMove);
    }
  }, 1100);
}

function pickAiMove(engine, depth) {
  const legal = engine.getLegalMoves();
  if (legal.length === 0) return null;
  const maximizing = engine.turn === 'w';
  let bestMove = legal[0];
  let bestVal = maximizing ? -9999 : 9999;

  for (const m of legal) {
    const copy = engine.clone();
    copy.applyMoveUnchecked(m);
    const val = minimax(copy, depth - 1, -10000, 10000, !maximizing);
    // Slight jitter so casual moves vary naturally
    const jitter = (Math.random() - 0.5) * 0.15;
    const total = val + jitter;
    if (maximizing && total > bestVal) {
      bestVal = total;
      bestMove = m;
    } else if (!maximizing && total < bestVal) {
      bestVal = total;
      bestMove = m;
    }
  }
  return bestMove;
}

function minimax(engine, depth, alpha, beta, maximizing) {
  if (depth <= 0) return engine.evaluateMaterial();
  const legal = engine.getLegalMovesWithoutSan();
  if (legal.length === 0) {
    if (engine.inCheck(engine.turn)) {
      return maximizing ? -900 - depth : 900 + depth;
    }
    return 0;
  }
  if (maximizing) {
    let maxEval = -9999;
    for (const m of legal) {
      const copy = engine.clone();
      copy.applyMoveUnchecked(m);
      const ev = minimax(copy, depth - 1, alpha, beta, false);
      if (ev > maxEval) maxEval = ev;
      if (ev > alpha) alpha = ev;
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = 9999;
    for (const m of legal) {
      const copy = engine.clone();
      copy.applyMoveUnchecked(m);
      const ev = minimax(copy, depth - 1, alpha, beta, true);
      if (ev < minEval) minEval = ev;
      if (ev < beta) beta = ev;
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function jumpToPly(targetPly) {
  clearOpponentTimer();
  const clamped = Math.max(0, Math.min(targetPly, state.moveHistory.length));
  state.currentPly = clamped;
  if (clamped === 0) {
    state.engine = new ChessEngine(START_FEN);
  } else {
    state.engine = new ChessEngine(state.moveHistory[clamped - 1].fenAfter);
  }
  state.selectedSquare = null;
  state.legalMovesFromSelected = [];
  renderAll();
}

/*************************************************************************
 * 7. OPTIMAL SAVING FORMATS (PGN & JSON) + FILE MANAGER ROUTING
 *************************************************************************/
function sequenceToPgn(seq) {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
  const headers = [
    `[Event "${seq.title || 'Opening Practice Sequence'}"]`,
    `[Site "ChessFlow Studio"]`,
    `[Date "${dateStr}"]`,
    `[White "${seq.side === 'w' ? 'Repertoire Player' : 'Opponent'}"]`,
    `[Black "${seq.side === 'b' ? 'Repertoire Player' : 'Opponent'}"]`,
    `[Result "*"]`,
    `[ECO "${(seq.eco || 'C50').split(' ')[0]}"]`,
    `[Opening "${seq.title || 'Custom Sequence'}"]`
  ];

  const tokens = [];
  for (let i = 0; i < seq.moves.length; i++) {
    if (i % 2 === 0) {
      tokens.push(`${Math.floor(i / 2) + 1}.`);
    }
    tokens.push(seq.moves[i]);
    const note = seq.notes && seq.notes[i];
    if (note && note.trim()) {
      tokens.push(`{ ${note.trim().replace(/[{}]/g, '')} }`);
    }
  }
  tokens.push('*');
  return headers.join('\n') + '\n\n' + tokens.join(' ') + '\n';
}

function parsePgnToSequence(pgnText, fallbackTitle = 'Imported PGN Sequence') {
  const titleMatch = pgnText.match(/\[(?:Opening|Event)\s+"([^"]+)"\]/i);
  const ecoMatch = pgnText.match(/\[ECO\s+"([^"]+)"\]/i);
  const title = titleMatch ? titleMatch[1] : fallbackTitle;
  const eco = ecoMatch ? `${ecoMatch[1]} • Imported Sequence` : 'Custom • Imported PGN';

  // Strip header tags
  const body = pgnText.replace(/\[[^\]]*\]/g, ' ').trim();
  const notes = {};
  const moves = [];

  // Tokenize moves and { comments }
  const regex = /\{([^}]*)\}|([^\s{}]+)/g;
  let match;
  while ((match = regex.exec(body)) !== null) {
    if (match[1] !== undefined) {
      if (moves.length > 0) {
        notes[moves.length - 1] = match[1].trim();
      }
    } else {
      const tok = match[2];
      if (/^\d+\.+$/.test(tok)) continue;
      if (tok === '*' || tok === '1-0' || tok === '0-1' || tok === '1/2-1/2') continue;
      const cleaned = tok.replace(/^\d+\.+/, '');
      if (cleaned) moves.push(cleaned);
    }
  }

  // Validate moves through ChessEngine
  const testEngine = new ChessEngine(START_FEN);
  const validMoves = [];
  for (const mSan of moves) {
    const res = testEngine.makeMoveBySan(mSan);
    if (!res) break;
    validMoves.push(res.san);
  }

  return {
    id: 'seq-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    title,
    eco,
    category: 'Custom',
    side: 'w',
    moves: validMoves,
    notes
  };
}

async function exportFileToOSFileManager(filename, content, mimeType = 'application/x-chess-pgn') {
  // 1. Try modern File System Access API (routes directly to native OS File Manager save dialog)
  if (typeof window.showSaveFilePicker === 'function') {
    try {
      const ext = filename.endsWith('.json') ? '.json' : '.pgn';
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: ext === '.json' ? 'ChessFlow Repertoire JSON' : 'Portable Game Notation (PGN)',
            accept: { [mimeType]: [ext] }
          }
        ]
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      showToast(`Saved "${filename}" via File Manager!`);
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      // Fall through to standard anchor download if blocked by sandboxed iframe
    }
  }

  // 2. Universal fallback download routing to browser/OS Downloads & File Manager
  const blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  showToast(`Exported "${filename}" to your File Manager!`);
}

function buildSequenceFromCurrentBoard() {
  const currentSeq = getActiveSequence();
  const rawTitle = (document.getElementById('saveSequenceTitleInput')?.value ?? pageDraft.title ?? '').trim();
  const side = document.getElementById('saveSequenceSideSelect')?.value || pageDraft.side || currentSeq?.side || 'w';
  const moves =
    state.moveHistory.length > 0
      ? state.moveHistory.map(m => m.san)
      : currentSeq
      ? currentSeq.moves.slice()
      : [];
  const notes = {};
  state.moveHistory.forEach((m, idx) => {
    if (m.note) notes[idx] = m.note;
  });
  Object.assign(notes, state.customNotes);

  return {
    id: 'custom-' + Date.now(),
    title: rawTitle || (currentSeq ? currentSeq.title + ' (Custom)' : 'Custom Gambit Line'),
    eco: 'Custom • Recorded Sequence',
    category: 'Custom',
    side,
    moves,
    notes
  };
}

/*************************************************************************
 * 8. UI RENDERING & SYNCHRONIZATION
 *************************************************************************/
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(msg, icon = '✨') {
  const banner = document.getElementById('toastBanner');
  document.getElementById('toastIcon').textContent = icon;
  document.getElementById('toastText').textContent = msg;
  banner.classList.remove('opacity-0', 'translate-y-2');
  banner.classList.add('opacity-100', 'translate-y-0');
  clearTimeout(banner._hideTimer);
  banner._hideTimer = setTimeout(() => {
    banner.classList.add('opacity-0', 'translate-y-2');
    banner.classList.remove('opacity-100', 'translate-y-0');
  }, 2800);
}

function setCoachMessage(html, tone = 'info') {
  const box = document.getElementById('coachFeedbackBox');
  if (!box) return;
  box.innerHTML = html;
  box.className = 'rounded-xl p-3 text-xs leading-relaxed border transition-all ';
  if (tone === 'warn') {
    box.className += 'bg-amber-950/40 border-amber-500/40 text-amber-200';
  } else if (tone === 'success') {
    box.className += 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200';
  } else {
    box.className += 'bg-slate-950/90 border-slate-800/90 text-slate-200';
  }
}

function updateSavedCountBadge() {
  const badge = document.getElementById('savedCountBadge');
  if (badge) badge.textContent = String(state.repertoire.length);
}

function renderTelemetry() {
  if (state.currentView !== 'studio') return;
  const acc =
    state.stats.attempts > 0
      ? Math.round((state.stats.correct / state.stats.attempts) * 100)
      : 100;
  document.getElementById('statAccuracy').textContent = acc + '%';
  document.getElementById('statStreak').textContent = String(state.stats.streak);
  document.getElementById('statCompleted').textContent = String(state.stats.completed);
}

function renderRepertoireList() {
  const container = document.getElementById('repertoireListContainer');
  if (!container) return;
  const q = state.searchQuery.toLowerCase().trim();
  const filtered = state.repertoire.filter(item => {
    if (state.filterCategory === 'Gambit' && item.category !== 'Gambit') return false;
    if (state.filterCategory === 'White' && item.side !== 'w') return false;
    if (state.filterCategory === 'Black' && item.side !== 'b') return false;
    if (state.filterCategory === 'Custom' && item.category !== 'Custom') return false;
    if (q && !item.title.toLowerCase().includes(q) && !(item.eco || '').toLowerCase().includes(q)) {
      return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div class="text-xs text-slate-500 py-4 text-center">No matching sequences found.</div>`;
    return;
  }

  container.innerHTML = filtered
    .map(item => {
      const active = item.id === state.activeSeqId;
      const sideBadge =
        item.side === 'w'
          ? '<span class="px-1.5 py-0.5 rounded bg-white text-slate-950 font-bold text-[10px]">W</span>'
          : '<span class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-600 font-bold text-[10px]">B</span>';
      return `
        <button type="button" data-seq-id="${escapeHtml(item.id)}" class="seq-select-btn w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
          active
            ? 'bg-amber-500/15 border-amber-500/50 text-white shadow'
            : 'bg-slate-950/60 hover:bg-slate-800/70 border-slate-800/80 text-slate-300'
        }">
          <div class="min-w-0">
            <div class="font-semibold text-xs truncate">${escapeHtml(item.title)}</div>
            <div class="text-[10px] text-slate-400 truncate">${escapeHtml(item.eco)} • ${item.moves.length} plies</div>
          </div>
          ${sideBadge}
        </button>
      `;
    })
    .join('');

  container.querySelectorAll('.seq-select-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectSequence(btn.getAttribute('data-seq-id'));
      if (state.currentView === 'studio') {
        switchSidebarTab('coach');
      }
    });
  });
}

function renderMoveList() {
  const container = document.getElementById('moveListContainer');
  const seq = getActiveSequence();
  const targetMoves =
    state.mode === 'drill' && seq
      ? seq.moves
      : state.moveHistory.map(m => m.san);

  document.getElementById('plyCounterLabel').textContent = `${state.currentPly} / ${targetMoves.length} plies`;

  if (seq && state.mode === 'drill') {
    const pct = seq.moves.length > 0 ? Math.min(100, Math.round((state.currentPly / seq.moves.length) * 100)) : 0;
    document.getElementById('drillProgressBadge').textContent = `Ply ${state.currentPly} / ${seq.moves.length}`;
    document.getElementById('drillProgressBar').style.width = `${pct}%`;
  } else {
    document.getElementById('drillProgressBadge').textContent = `${state.currentPly} Plies`;
    document.getElementById('drillProgressBar').style.width = '100%';
  }

  const maxLen = Math.max(state.moveHistory.length, state.mode === 'drill' && seq ? seq.moves.length : 0);
  if (maxLen === 0) {
    container.innerHTML = `<div class="text-slate-500 text-xs py-6 text-center">Play moves on the board to build or practice a sequence.</div>`;
    return;
  }

  const rows = [];
  for (let i = 0; i < maxLen; i += 2) {
    const moveNum = Math.floor(i / 2) + 1;
    const wPlayed = state.moveHistory[i];
    const bPlayed = state.moveHistory[i + 1];
    const wBook = seq && seq.moves[i] ? seq.moves[i] : '';
    const bBook = seq && seq.moves[i + 1] ? seq.moves[i + 1] : '';

    const wLabel = wPlayed ? wPlayed.san : state.mode === 'drill' ? '•••' : '';
    const bLabel = bPlayed ? bPlayed.san : state.mode === 'drill' && bBook ? '•••' : '';

    const wActive = state.currentPly === i + 1;
    const bActive = state.currentPly === i + 2;

    rows.push(`
      <div class="grid grid-cols-7 items-center px-2 py-1 rounded-lg hover:bg-slate-900/80">
        <span class="col-span-1 text-slate-500">${moveNum}.</span>
        <button type="button" data-ply="${i + 1}" class="ply-jump-btn col-span-3 text-left px-2 py-0.5 rounded ${
          wActive ? 'bg-amber-500/25 text-amber-300 font-bold' : wPlayed ? 'text-slate-200 hover:text-white' : 'text-slate-600 cursor-default'
        }">${escapeHtml(wLabel)}</button>
        <button type="button" data-ply="${i + 2}" class="ply-jump-btn col-span-3 text-left px-2 py-0.5 rounded ${
          bActive ? 'bg-amber-500/25 text-amber-300 font-bold' : bPlayed ? 'text-slate-200 hover:text-white' : 'text-slate-600 cursor-default'
        }">${escapeHtml(bLabel)}</button>
      </div>
    `);
  }
  container.innerHTML = rows.join('');

  container.querySelectorAll('.ply-jump-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const ply = parseInt(btn.getAttribute('data-ply'), 10);
      if (ply <= state.moveHistory.length) {
        jumpToPly(ply);
      }
    });
  });

  // Populate note input for current ply
  const currentNote =
    state.currentPly > 0 && state.moveHistory[state.currentPly - 1]
      ? state.moveHistory[state.currentPly - 1].note || ''
      : '';
  document.getElementById('moveNoteInput').value = currentNote;
}

function renderHeaderAndEval() {
  const seq = getActiveSequence();
  if (seq) {
    document.getElementById('activeOpeningTitle').textContent = seq.title;
    document.getElementById('activeOpeningEco').textContent = `${seq.eco} • ${seq.moves.length} book plies`;
    const badge = document.getElementById('activeSideBadge');
    if (seq.side === 'w') {
      badge.textContent = 'White';
      badge.className = 'px-2 py-1 rounded-lg text-xs font-bold bg-white text-slate-950 shadow-sm shrink-0';
    } else {
      badge.textContent = 'Black';
      badge.className = 'px-2 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-100 border border-slate-600 shadow-sm shrink-0';
    }
  }

  const pill = document.getElementById('turnStatusPill');
  const legal = state.engine.getLegalMovesWithoutSan();
  if (legal.length === 0) {
    if (state.engine.inCheck(state.engine.turn)) {
      pill.textContent = `Checkmate! ${state.engine.turn === 'w' ? 'Black' : 'White'} wins`;
      pill.className = 'px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
    } else {
      pill.textContent = 'Stalemate / Draw';
      pill.className = 'px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300';
    }
  } else if (state.engine.inCheck(state.engine.turn)) {
    pill.textContent = `${state.engine.turn === 'w' ? 'White' : 'Black'} in Check!`;
    pill.className = 'px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40';
  } else {
    pill.textContent = `${state.engine.turn === 'w' ? 'White' : 'Black'} to move`;
    pill.className = 'px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30';
  }

  // Update evaluation bar
  const score = state.engine.evaluateMaterial();
  const whitePct = Math.max(8, Math.min(92, 50 + score * 6));
  document.getElementById('evalBarBlack').style.height = `${100 - whitePct}%`;
}

function renderFileManagerModal() {
  const tbody = document.getElementById('fileManagerTableBody');
  if (!tbody) return;
  tbody.innerHTML = state.repertoire
    .map(seq => {
      const preview = seq.moves.slice(0, 8).join(' ') + (seq.moves.length > 8 ? ' ...' : '');
      return `
        <tr class="hover:bg-slate-800/50 transition">
          <td class="py-2.5 px-3 font-semibold text-white">${escapeHtml(seq.title)}</td>
          <td class="py-2.5 px-3">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
              seq.side === 'w' ? 'bg-white text-slate-950' : 'bg-slate-800 text-slate-200 border border-slate-600'
            }">${seq.side === 'w' ? 'White' : 'Black'}</span>
          </td>
          <td class="py-2.5 px-3 font-mono text-slate-400">${escapeHtml(preview)}</td>
          <td class="py-2.5 px-3 text-right whitespace-nowrap">
            <button type="button" data-load-id="${escapeHtml(seq.id)}" class="fm-load-btn px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold mr-1">Practice</button>
            <button type="button" data-export-id="${escapeHtml(seq.id)}" class="fm-export-btn px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold mr-1">Save File</button>
            <button type="button" data-delete-id="${escapeHtml(seq.id)}" class="fm-delete-btn px-2 py-1 rounded bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 font-semibold">✕</button>
          </td>
        </tr>
      `;
    })
    .join('');

  tbody.querySelectorAll('.fm-load-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const loadId = btn.getAttribute('data-load-id');
      document.getElementById('fileManagerModal').classList.add('hidden');
      selectSequence(loadId);
      enterStudioWorkspace(state.mode, 'coach');
      showToast('Loaded sequence onto board!');
    });
  });

  tbody.querySelectorAll('.fm-export-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const seq = state.repertoire.find(s => s.id === btn.getAttribute('data-export-id'));
      if (!seq) return;
      const fmt = document.getElementById('exportFormatSelect').value;
      const slug = seq.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'sequence';
      if (fmt === 'json') {
        exportFileToOSFileManager(`${slug}.chessrep.json`, JSON.stringify(seq, null, 2), 'application/json');
      } else {
        exportFileToOSFileManager(`${slug}.pgn`, sequenceToPgn(seq), 'application/x-chess-pgn');
      }
    });
  });

  tbody.querySelectorAll('.fm-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (state.repertoire.length <= 1) {
        showToast('At least one sequence must remain in library.', '⚠️');
        return;
      }
      const id = btn.getAttribute('data-delete-id');
      state.repertoire = state.repertoire.filter(s => s.id !== id);
      if (state.activeSeqId === id) {
        state.activeSeqId = state.repertoire[0].id;
      }
      persistRepertoire();
      renderFileManagerModal();
      renderAll();
      showToast('Sequence removed from library.');
    });
  });

  // Populate inspector with active sequence PGN
  const activeSeq = getActiveSequence();
  if (activeSeq) {
    document.getElementById('pgnInspectorTextarea').value = sequenceToPgn(activeSeq);
  }
}

function switchSidebarTab(tabKey) {
  state.sidebarTab = tabKey;
  const panels = {
    coach: document.getElementById('sidebarPanelCoach'),
    library: document.getElementById('sidebarPanelLibrary'),
    save: document.getElementById('sidebarPanelSave'),
    settings: document.getElementById('sidebarPanelSettings')
  };
  Object.keys(panels).forEach(k => {
    if (panels[k]) {
      if (k === tabKey) panels[k].classList.remove('hidden');
      else panels[k].classList.add('hidden');
    }
  });
  document.querySelectorAll('.sidebar-tab-btn').forEach(btn => {
    const k = btn.getAttribute('data-sidebar-tab');
    if (k === tabKey) {
      btn.className = 'sidebar-tab-btn py-2 px-2 rounded-xl text-xs font-semibold transition-all bg-amber-500 text-slate-950 shadow text-center truncate';
    } else {
      btn.className = 'sidebar-tab-btn py-2 px-2 rounded-xl text-xs font-semibold transition-all text-slate-300 hover:text-white text-center truncate';
    }
  });
}

function renderModeButtons() {
  const modeMeta = {
    drill: { label: '🎯 Drill Practice', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
    record: { label: '⏺️ Record Sequence', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
    spar: { label: '⚔️ Free Play / AI', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30' }
  };
  const badge = document.getElementById('headerActiveModeBadge');
  if (badge && modeMeta[state.mode]) {
    badge.textContent = modeMeta[state.mode].label;
    badge.className = 'hidden sm:inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ' + modeMeta[state.mode].cls;
  }

  const seq = getActiveSequence();
  if (seq) {
    const hTitle = document.getElementById('homeActiveSeqTitle');
    const hMeta = document.getElementById('homeActiveSeqMeta');
    if (hTitle) hTitle.textContent = seq.title;
    if (hMeta) hMeta.textContent = `${seq.eco} • ${seq.moves.length} book plies (${seq.side === 'w' ? 'White' : 'Black'})`;
  }

  const aiBar = document.getElementById('aiSparringBar');
  if (aiBar) aiBar.classList.toggle('hidden', state.mode !== 'spar');
}

function renderAll() {
  renderModeButtons();
  updateSavedCountBadge();
  if (state.currentView === 'studio') {
    renderRepertoireList();
    renderHeaderAndEval();
    renderMoveList();
    renderTelemetry();
    drawChessBoard();
  }
}
