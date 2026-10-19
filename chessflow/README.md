# ChessFlow Studio

Open `index.html` to start. Both pages work as static files or through a static web server; Tailwind and fonts retain their existing CDN dependencies.

- `index.html`: Home, training mode selection, and active opening summary. This is the default entry page.
- `studio.html`: Board workspace for Drill Practice, Record Sequence, and Free Play / AI. Launch options use `mode=drill|record|spar` and `tab=coach|library|save|settings`.
- `css/chessflow.css`: Shared styles.
- `js/home.js` and `js/studio.js`: Page initialization and page-specific controls.
- `js/common.js`: Shared navigation controls, exports, and the Sequence Files dialog.
- `js/navigation.js`: Page navigation and session state, including unsaved board history and recording drafts.
- `js/app.js`: Shared application state, training actions, storage, file formats, and UI rendering.
- `js/engine.js`, `js/audio.js`, `js/repertoire.js`, and `js/board.js`: Chess rules, synthesized audio, default openings, and board rendering.
- `js/tailwind-config.js`: Existing Tailwind configuration.

Repertoire and statistics retain the existing localStorage keys. Workspace state uses sessionStorage to carry the selected opening, board position, preferences, and recording draft between pages within the same browser tab. Drill and Record launches initialize the selected line; AI Sparring continues the current board. The Sequence Files dialog is available on both pages.
