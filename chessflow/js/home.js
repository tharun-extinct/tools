window.addEventListener('load', () => {
  loadSavedState();
  restorePageSession();
  bindCommonEvents();
  const launch = (mode, tab = 'coach') => enterStudioWorkspace(mode, tab);
  document.getElementById('modeDrillBtn').addEventListener('click', () => launch('drill'));
  document.getElementById('modeRecordBtn').addEventListener('click', () => launch('record'));
  document.getElementById('modeSparBtn').addEventListener('click', () => launch('spar'));
  document.getElementById('homeQuickStartBtn').addEventListener('click', () => launch('drill'));
  document.getElementById('homeBrowseOpeningsBtn').addEventListener('click', () => launch('drill', 'library'));
  renderAll();
});
