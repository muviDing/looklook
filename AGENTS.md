# AGENTS.md

## Cursor Cloud specific instructions

This is an Electron desktop application ("早该看看了") for local video file management. It uses vanilla JS (no TypeScript), NeDB for embedded storage, and bundled FFmpeg/FFprobe for video processing.

### Running the app

- **Dev start**: `npm start` (alias for `electron .`). On headless Linux, use `--no-sandbox` flag: `DISPLAY=:1 npx electron . --no-sandbox`.
- **Build**: `npm run build` builds for the current platform via electron-builder. The `package.json` build config targets Windows (NSIS), but `npx electron-builder --linux --dir` works for Linux. The `extraResources` section references `.exe` files, so expect a harmless warning on Linux builds.

### Project structure

See `README.md` for the full project structure overview. Key entry points:
- `main.js` — Electron main process
- `index.html` — Renderer entry
- `preload.js` — Context bridge
- `js/database.js` — NeDB database layer

### Lint / Test / Formatting

No linting, testing, or formatting tools are configured in this project. There are no ESLint, Prettier, Jest, Mocha, or similar configs.

### Data & state

In development mode, user data is stored in `userdata/` at the project root (databases, thumbnails, logs, settings). This directory is created automatically on first run.

### Non-obvious caveats

- D-Bus errors (`Failed to connect to the bus`) are normal on headless Linux and do not affect functionality.
- GPU-related errors (`Exiting GPU process due to errors during initialization`) are expected without a real GPU and do not break the app.
- FFmpeg/FFprobe binaries are platform-specific; `ffmpeg-static` and `ffprobe-static` npm packages provide the correct binaries for the current OS.
