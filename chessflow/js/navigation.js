const PAGE_SESSION_KEY = 'chessflow_workspace_v1';
const HOME_PAGE = 'index.html';
const SESSION_FIELDS = [
  'mode', 'sidebarTab', 'activeSeqId', 'boardFlipped', 'boardTheme',
  'showGuideArrow', 'showPositionEvaluation', 'autoPlayOpponent', 'aiDepth', 'moveHistory',
  'currentPly', 'customNotes'
];
let pageDraft = {};

function savePageSession() {
  const snapshot = Object.fromEntries(SESSION_FIELDS.map(key => [key, state[key]]));
  if (state.currentView === 'studio') {
    pageDraft = {
      title: document.getElementById('saveSequenceTitleInput').value,
      side: document.getElementById('saveSequenceSideSelect').value,
      note: document.getElementById('moveNoteInput').value
    };
  }
  snapshot.draft = pageDraft;
  snapshot.fen = state.engine.toFen();
  snapshot.muted = sound.muted;
  try {
    sessionStorage.setItem(PAGE_SESSION_KEY, JSON.stringify(snapshot));
  } catch (error) {
    // Navigation still works when browser storage is unavailable.
  }
}

function restorePageSession() {
  try {
    const snapshot = JSON.parse(sessionStorage.getItem(PAGE_SESSION_KEY));
    if (!snapshot) return null;
    const engine = new ChessEngine(snapshot.fen);
    SESSION_FIELDS.forEach(key => {
      if (Object.prototype.hasOwnProperty.call(snapshot, key)) state[key] = snapshot[key];
    });
    state.engine = engine;
    if (!state.repertoire.some(seq => seq.id === state.activeSeqId)) {
      state.activeSeqId = state.repertoire[0].id;
      state.engine = new ChessEngine();
      state.moveHistory = [];
      state.currentPly = 0;
      state.customNotes = {};
    }
    pageDraft = snapshot.draft || {};
    sound.muted = Boolean(snapshot.muted);
    document.getElementById('soundIcon').textContent = sound.muted ? '🔇' : '🔊';
    return snapshot;
  } catch (error) {
    return null;
  }
}

function restoreStudioInputs() {
  const seq = getActiveSequence();
  const params = new URLSearchParams(location.search);
  const keepDraft = params.get('start') !== '1' || state.mode === 'spar';
  document.getElementById('saveSequenceTitleInput').value = keepDraft && pageDraft.title != null ? pageDraft.title : seq.title;
  document.getElementById('saveSequenceSideSelect').value = keepDraft && pageDraft.side != null ? pageDraft.side : seq.side || 'w';
  document.getElementById('boardThemeSelect').value = state.boardTheme;
  document.getElementById('toggleGuideArrowBtn').textContent = state.showGuideArrow ? 'ON' : 'OFF';
  document.getElementById('toggleAutoOpponentBtn').textContent = state.autoPlayOpponent ? 'ON' : 'OFF';
  document.querySelectorAll('.ai-lvl-btn').forEach(btn => {
    btn.className = Number(btn.dataset.depth) === state.aiDepth
      ? 'ai-lvl-btn px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-semibold'
      : 'ai-lvl-btn px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px]';
  });
}

function showHomeScreen() {
  clearOpponentTimer();
  savePageSession();
  if (state.currentView === 'studio') location.assign(HOME_PAGE);
}

function enterStudioWorkspace(modeKey, preferredTab = 'coach') {
  if (modeKey) state.mode = modeKey;
  if (state.currentView === 'home') {
    savePageSession();
    const params = new URLSearchParams({
      mode: state.mode,
      tab: preferredTab,
      sequence: state.activeSeqId,
      start: '1'
    });
    location.assign('studio.html?' + params);
    return;
  }
  switchSidebarTab(['coach', 'library', 'save', 'settings'].includes(preferredTab) ? preferredTab : 'coach');
  renderAll();
  if (pageDraft.note != null) {
    document.getElementById('moveNoteInput').value = pageDraft.note;
    delete pageDraft.note;
  }
  requestAnimationFrame(resizeAndDrawBoard);
}

window.addEventListener('pagehide', savePageSession);
