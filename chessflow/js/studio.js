function handleSquareInteraction(r, c) {
  if (state.selectedSquare) {
    if (state.selectedSquare.r === r && state.selectedSquare.c === c) {
      state.selectedSquare = null;
      state.legalMovesFromSelected = [];
      drawChessBoard();
      return;
    }
    const moved = attemptBoardMove(state.selectedSquare.r, state.selectedSquare.c, r, c);
    if (moved) return;
  }

  const piece = state.engine.board[r][c];
  if (piece && piece.color === state.engine.turn) {
    state.selectedSquare = { r, c };
    const allLegal = state.engine.getLegalMoves();
    state.legalMovesFromSelected = allLegal.filter(m => m.from.r === r && m.from.c === c);
  } else {
    state.selectedSquare = null;
    state.legalMovesFromSelected = [];
  }
  drawChessBoard();
}

function bindStudioEvents() {
  const canvas = document.getElementById('chessBoardCanvas');

  function getCoordsFromClientEvent(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const sc = Math.max(0, Math.min(7, Math.floor((x / rect.width) * 8)));
    const sr = Math.max(0, Math.min(7, Math.floor((y / rect.height) * 8)));
    return screenToBoard(sr, sc);
  }

  canvas.addEventListener('mousedown', e => {
    const { r, c } = getCoordsFromClientEvent(e.clientX, e.clientY);
    handleSquareInteraction(r, c);
  });

  canvas.addEventListener(
    'touchstart',
    e => {
      if (e.touches && e.touches.length > 0) {
        e.preventDefault();
        const t = e.touches[0];
        const { r, c } = getCoordsFromClientEvent(t.clientX, t.clientY);
        handleSquareInteraction(r, c);
      }
    },
    { passive: false }
  );

  // Promotion picker buttons
  document.querySelectorAll('.promo-choice-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const promo = btn.getAttribute('data-promo');
      document.getElementById('promotionOverlay').classList.add('hidden');
      if (state.pendingPromotion) {
        const { fromR, fromC, toR, toC } = state.pendingPromotion;
        state.pendingPromotion = null;
        attemptBoardMove(fromR, fromC, toR, toC, promo);
      }
    });
  });

  document.querySelectorAll('.sidebar-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchSidebarTab(btn.getAttribute('data-sidebar-tab'));
    });
  });

  document.getElementById('quickSwitchOpeningBtn').addEventListener('click', () => {
    switchSidebarTab('library');
  });

  // Transport Controls
  document.getElementById('stepStartBtn').addEventListener('click', () => jumpToPly(0));
  document.getElementById('stepBackBtn').addEventListener('click', () => jumpToPly(state.currentPly - 1));
  document.getElementById('stepForwardBtn').addEventListener('click', () => jumpToPly(state.currentPly + 1));
  document.getElementById('stepEndBtn').addEventListener('click', () => jumpToPly(state.moveHistory.length));

  document.getElementById('hintMoveBtn')?.addEventListener('click', () => {
    state.showGuideArrow = true;
    document.getElementById('toggleGuideArrowBtn').textContent = 'ON';
    const seq = getActiveSequence();
    if (seq && state.currentPly < seq.moves.length) {
      const nextSan = seq.moves[state.currentPly];
      const note = (seq.notes && seq.notes[state.currentPly]) || 'Follow the golden arrow on the board!';
      setCoachMessage(`💡 <strong>Book Hint:</strong> Play <strong>${nextSan}</strong> — ${escapeHtml(note)}`, 'info');
    } else {
      const best = pickAiMove(state.engine, 2);
      if (best) {
        setCoachMessage(`💡 <strong>Engine Suggestion:</strong> Try <strong>${best.san}</strong> (${best.fromAlg} → ${best.toAlg}).`, 'info');
      }
    }
    drawChessBoard();
  });

  document.getElementById('playBookMoveBtn')?.addEventListener('click', () => {
    const seq = getActiveSequence();
    if (seq && state.currentPly < seq.moves.length) {
      const expectedSan = seq.moves[state.currentPly];
      const legal = state.engine.getLegalMoves();
      const bookMove = legal.find(
        m => m.san.replace(/[+#!?]+$/g, '') === expectedSan.replace(/[+#!?]+$/g, '') || m.san === expectedSan
      );
      if (bookMove) {
        executeValidatedMove(bookMove);
        return;
      }
    }
    const fallback = pickAiMove(state.engine, 2);
    if (fallback) executeValidatedMove(fallback);
  });

  document.getElementById('flipBoardBtn').addEventListener('click', () => {
    state.boardFlipped = !state.boardFlipped;
    drawChessBoard();
  });

  document.getElementById('restartLineBtn').addEventListener('click', () => {
    selectSequence(state.activeSeqId, { startAtBeginning: true });
    maybeTriggerAiSparMove();
    showToast('Sequence reset to move 1');
  });

  // Repertoire search & filters
  document.getElementById('repertoireSearchInput').addEventListener('input', e => {
    state.searchQuery = e.target.value;
    renderRepertoireList();
  });

  document.querySelectorAll('.rep-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.filterCategory = btn.getAttribute('data-filter');
      document.querySelectorAll('.rep-filter-btn').forEach(b => {
        b.className = 'rep-filter-btn px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-800/70 text-slate-400 hover:text-slate-200 whitespace-nowrap';
      });
      btn.className = 'rep-filter-btn px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap';
      renderRepertoireList();
    });
  });

  document.getElementById('newSequenceBtn').addEventListener('click', () => {
    enterStudioWorkspace('record', 'coach');
    state.engine = new ChessEngine(START_FEN);
    state.moveHistory = [];
    state.currentPly = 0;
    state.customNotes = {};
    document.getElementById('saveSequenceTitleInput').value = 'New Custom Gambit';
    setCoachMessage('Started a blank board in <strong>Record Mode</strong>. Make moves for White & Black, then open the <strong>💾 Save</strong> tab to save!', 'info');
    renderAll();
  });

  // Settings & Toggles
  document.getElementById('boardThemeSelect').addEventListener('change', e => {
    state.boardTheme = e.target.value;
    drawChessBoard();
  });

  document.getElementById('togglePositionEvaluationBtn').addEventListener('click', () => {
    state.showPositionEvaluation = !state.showPositionEvaluation;
    renderHeaderAndEval();
    resizeAndDrawBoard();
    savePageSession();
  });

  document.getElementById('toggleGuideArrowBtn').addEventListener('click', e => {
    state.showGuideArrow = !state.showGuideArrow;
    e.currentTarget.textContent = state.showGuideArrow ? 'ON' : 'OFF';
    drawChessBoard();
  });

  document.getElementById('toggleAutoOpponentBtn').addEventListener('click', e => {
    state.autoPlayOpponent = !state.autoPlayOpponent;
    e.currentTarget.textContent = state.autoPlayOpponent ? 'ON' : 'OFF';
    if (state.autoPlayOpponent) maybeTriggerOpponentAutoMove();
  });

  document.getElementById('resetStatsBtn').addEventListener('click', () => {
    state.stats = { attempts: 0, correct: 0, streak: 0, completed: 0 };
    persistStats();
    showToast('Practice statistics reset');
  });

  // AI strength buttons
  document.querySelectorAll('.ai-lvl-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.aiDepth = parseInt(btn.getAttribute('data-depth'), 10);
      document.querySelectorAll('.ai-lvl-btn').forEach(b => {
        b.className = 'ai-lvl-btn px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px]';
      });
      btn.className = 'ai-lvl-btn px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-semibold';
    });
  });

  // Move Note saving
  document.getElementById('saveMoveNoteBtn').addEventListener('click', () => {
    if (state.currentPly === 0) {
      showToast('Play a move first before attaching a note!', '⚠️');
      return;
    }
    const val = document.getElementById('moveNoteInput').value.trim();
    state.customNotes[state.currentPly - 1] = val;
    if (state.moveHistory[state.currentPly - 1]) {
      state.moveHistory[state.currentPly - 1].note = val;
    }
    const seq = getActiveSequence();
    if (seq) {
      seq.notes = seq.notes || {};
      seq.notes[state.currentPly - 1] = val;
      persistRepertoire();
    }
    showToast('Coaching note saved for ply ' + state.currentPly);
  });

  // Save to Library & Save to File Manager
  document.getElementById('saveToLibraryBtn').addEventListener('click', () => {
    const newSeq = buildSequenceFromCurrentBoard();
    if (newSeq.moves.length === 0) {
      showToast('Make at least 1 move on the board to save a sequence!', '⚠️');
      return;
    }
    state.repertoire.unshift(newSeq);
    state.activeSeqId = newSeq.id;
    persistRepertoire();
    renderAll();
    showToast(`Saved "${newSeq.title}" (${newSeq.moves.length} plies) to Library!`);
  });

  // Copy PGN with fallback
  document.getElementById('copyPgnBtn').addEventListener('click', () => {
    const seq = buildSequenceFromCurrentBoard();
    const pgn = sequenceToPgn(seq);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(pgn).then(
        () => showToast('PGN copied to clipboard!'),
        () => fallbackCopyText(pgn)
      );
    } else {
      fallbackCopyText(pgn);
    }
  });

  function fallbackCopyText(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast('PGN copied to clipboard!');
    } catch (e) {}
    document.body.removeChild(ta);
  }

  // Keyboard navigation for move stepping
  window.addEventListener('keydown', e => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement && document.activeElement.tagName)) {
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      jumpToPly(state.currentPly - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      jumpToPly(state.currentPly + 1);
    }
  });

  window.addEventListener('resize', resizeAndDrawBoard);
}

// Reveal on entering the top edge; pointer motion elsewhere does not extend the delay.
function bindRetractableNavbar() {
  const navbar = document.getElementById('studioNavbar');
  const reveal = document.getElementById('studioNavReveal');
  let hideTimer;
  let atTop = false;
  let keyboardFocus = false;
  const hide = () => {
    if (keyboardFocus && navbar.contains(document.activeElement)) return;
    navbar.classList.remove('is-revealed');
    reveal.setAttribute('aria-expanded', 'false');
  };
  const show = () => {
    clearTimeout(hideTimer);
    navbar.classList.add('is-revealed');
    reveal.setAttribute('aria-expanded', 'true');
    hideTimer = setTimeout(hide, 3500);
  };
  document.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    const withinTop = event.clientY <= 12;
    if (withinTop && !atTop) show();
    atTop = withinTop;
  });
  document.documentElement.addEventListener('pointerleave', () => { atTop = false; });
  document.addEventListener('keydown', event => {
    if (event.key === 'Tab') keyboardFocus = true;
    if (event.key === 'Escape') {
      if (navbar.contains(document.activeElement)) document.activeElement.blur();
      keyboardFocus = false;
      clearTimeout(hideTimer);
      hide();
    }
  });
  document.addEventListener('pointerdown', () => { keyboardFocus = false; });
  reveal.addEventListener('click', show);
  reveal.addEventListener('focus', show);
  navbar.addEventListener('focusin', show);
  navbar.addEventListener('focusout', () => {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, 3500);
  });
  navbar.addEventListener('click', show);
}

window.addEventListener('load', () => {
  bindRetractableNavbar();
  loadSavedState();
  const restored = restorePageSession();
  const params = new URLSearchParams(location.search);
  const mode = params.get('mode');
  if (['drill', 'record', 'spar'].includes(mode)) state.mode = mode;
  const sequenceId = params.get('sequence');
  if (sequenceId && state.repertoire.some(seq => seq.id === sequenceId)) {
    state.activeSeqId = sequenceId;
  }
  bindCommonEvents();
  bindStudioEvents();
  if (!restored || params.get('start') === '1') {
    // Sparring continues the current board; drill and record restart their line.
    if (!restored || state.mode !== 'spar' || restored.activeSeqId !== state.activeSeqId) {
      selectSequence(state.activeSeqId);
    }
  }
  restoreStudioInputs();
  enterStudioWorkspace(state.mode, params.get('tab') || state.sidebarTab);
  maybeTriggerOpponentAutoMove();
  maybeTriggerAiSparMove();
  // Consume launch options so refreshing resumes the current board.
  history.replaceState(null, '', location.pathname + '?mode=' + state.mode);
});
