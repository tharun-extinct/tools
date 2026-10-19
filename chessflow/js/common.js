function bindCommonEvents() {
  document.getElementById('soundToggleBtn').addEventListener('click', () => {
    sound.muted = !sound.muted;
    document.getElementById('soundIcon').textContent = sound.muted ? '🔇' : '🔊';
    showToast(sound.muted ? 'Audio muted' : 'Synthesized chess audio enabled');
  });

  function triggerDirectExport() {
    const seq = buildSequenceFromCurrentBoard();
    if (seq.moves.length === 0) {
      showToast('No moves to export yet!', '⚠️');
      return;
    }
    const fmt = document.getElementById('exportFormatSelect').value || 'pgn';
    const slug = seq.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'chess-sequence';
    if (fmt === 'json') {
      exportFileToOSFileManager(`${slug}.chessrep.json`, JSON.stringify(seq, null, 2), 'application/json');
    } else {
      exportFileToOSFileManager(`${slug}.pgn`, sequenceToPgn(seq), 'application/x-chess-pgn');
    }
  }

  document.getElementById('quickSaveFileBtn').addEventListener('click', triggerDirectExport);
  document.getElementById('saveToFilePickerBtn')?.addEventListener('click', triggerDirectExport);
  document.getElementById('brandHomeBtn').addEventListener('click', showHomeScreen);
  document.getElementById('backToHomeBtn').addEventListener('click', showHomeScreen);
  // File Manager Modal & File Input Import
  document.getElementById('openFileManagerBtn').addEventListener('click', () => {
    renderFileManagerModal();
    document.getElementById('fileManagerModal').classList.remove('hidden');
  });

  document.getElementById('closeFileManagerBtn').addEventListener('click', () => {
    document.getElementById('fileManagerModal').classList.add('hidden');
  });

  const fileInput = document.getElementById('hiddenFileInput');
  document.getElementById('importFromFileBtn')?.addEventListener('click', () => fileInput.click());
  document.getElementById('modalImportFileBtn').addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = String(ev.target.result || '');
      try {
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            state.repertoire = parsed.concat(state.repertoire);
            state.activeSeqId = state.repertoire[0].id;
          } else if (parsed && Array.isArray(parsed.moves)) {
            parsed.id = 'imp-' + Date.now();
            state.repertoire.unshift(parsed);
            state.activeSeqId = parsed.id;
          }
        } else {
          const seq = parsePgnToSequence(text, file.name.replace(/\.(pgn|txt)$/i, ''));
          if (seq.moves.length > 0) {
            state.repertoire.unshift(seq);
            state.activeSeqId = seq.id;
          } else {
            showToast('Could not parse legal moves from file.', '⚠️');
            return;
          }
        }
        persistRepertoire();
        selectSequence(state.activeSeqId);
        enterStudioWorkspace(state.mode, 'coach');
        renderFileManagerModal();
        showToast(`Imported "${file.name}" into Repertoire Library!`);
      } catch (err) {
        showToast('Invalid PGN or JSON file format.', '⚠️');
      }
    };
    reader.readAsText(file);
    fileInput.value = '';
  });

  document.getElementById('modalExportAllBtn').addEventListener('click', () => {
    exportFileToOSFileManager(
      'chessflow-full-repertoire.chessrep.json',
      JSON.stringify(state.repertoire, null, 2),
      'application/json'
    );
  });

  document.getElementById('loadPgnTextBtn').addEventListener('click', () => {
    const txt = document.getElementById('pgnInspectorTextarea').value.trim();
    if (!txt) return;
    const seq = parsePgnToSequence(txt, 'Imported PGN Line');
    if (seq.moves.length === 0) {
      showToast('No valid chess moves found in PGN text.', '⚠️');
      return;
    }
    state.repertoire.unshift(seq);
    state.activeSeqId = seq.id;
    persistRepertoire();
    document.getElementById('fileManagerModal').classList.add('hidden');
    selectSequence(seq.id);
    enterStudioWorkspace(state.mode, 'coach');
    showToast(`Imported ${seq.moves.length} plies from PGN text!`);
  });

}
