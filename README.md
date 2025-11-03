# ASCII Love

ASCII Love is a freeform ASCII art editor built with Vite + React and optionally bundled as an Electron desktop app. It focuses on layered glyph placement, palette-aware workflows, and export formats that slot into the ASCII Love runtime.

## Quick Start

### Browser build
1. Install dependencies: `npm install`
2. Launch the dev server: `npm run dev`
   - Vite serves the renderer at http://localhost:5173 with hot module reloading.
3. To preview a production build locally, run `npm run build` followed by `npm run preview`.

### Desktop shell
1. Install dependencies: `npm install`
2. Start Electron in watch mode: `npm run desktop:dev`
   - Electron Forge with the Vite plugin loads the renderer and preload bundles with live reload.
3. Package an unpacked desktop app: `npm run desktop:package`
4. Produce platform installers: `npm run desktop:make -- --platform=<darwin|win32|linux> --arch=<arm64|x64>`
   - Artifacts land under `out/` and `.vite/`.

## Command Reference

**Development and build**
- `npm run dev` - start Vite in development mode.
- `npm run preview` - serve the latest production build.
- `npm run build` - type-check and emit production assets.
- `npm run typecheck` - run the TypeScript compiler without emitting files.

**Quality and testing**
- `npm run lint` - run ESLint with the project config.
- `npm test` - execute the Vitest suite headlessly.
- `npm run test:ui` - open the Vitest UI runner for focused debugging.
- `npm run test:e2e` - run Playwright end-to-end scenarios.

**Desktop tooling**
- `npm run desktop:dev` - launch the Electron shell in watch mode.
- `npm run desktop:package` - generate unpacked desktop artifacts.
- `npm run desktop:make` - build distributable installers (pass platform and arch via `--`).

## Feature Overview

### Canvas and cursor workflows
- Cursor modes for Select (`V`), Place (`P`), Transform (`T`), and Pan (`Space`), surfaced in the toolbar and hotkey panel.
- Freeform glyph placement with optional snap-to-grid, adjustable interval, and toggleable grid or crosshair overlays.
- Transform mode handles scaling, rotation, and skewing while keeping focus on the canvas for hotkey support.

### Document library and autosave
- Multiple canvases with quick switching, creation, and deletion from the toolbar document chooser.
- Autosave runs in the background, tracks status (idle, dirty, saving, saved, error), and persists documents through `useEditorPersistence`.
- Manual saves flush pending autosave work so exports always reflect the latest state.

### Palette management
- Create, rename, and delete palettes; swatches can be reordered via drag and drop.
- Updating a swatch or picking a color applies immediately to the active glyph selection with live editing via color inputs.
- Immutable palettes are protected from accidental deletion, while mutable sets follow the user selection.

### Glyph library
- CP437 glyph sheet with tabbed sheet scaffolding ready for additional libraries.
- Selecting a glyph arms the cursor in place mode; planned font variants are tracked in issue #22.

### Layers and groups
- Layer panel provides visibility toggles, reordering, renaming, and glyph counts per layer.
- Group panel assigns human-friendly names and addressable keys, and selecting a group focuses the member glyphs.
- Group creation and renaming auto-focus inputs for rapid workflows; enhancements to group selection are tracked in issue #21.

### Exporters
- Export menu supports full-document or selection-scoped exports with configurable padding.
- `.love.json` and SVG exporters share a registry so future formats can plug in via `src/shared/exporters`.
- Desktop builds route exports through the Electron bridge to prompt for a file path; browser builds fall back to blob downloads.

### Hotkeys and dialogs
- `useEditorHotkeys` centralizes bindings for mode switching, grid toggles, layer focus, and document actions.
- The in-app dialog host replaces native `prompt` and `confirm`, enabling secure context isolation in Electron.

## Architecture Notes
- Vite and React renderer written in TypeScript; state management uses Zustand with Immer for immutable updates.
- Feature folders under `src/features/` encapsulate UI panels, with shared logic in `src/shared/`.
- Electron workspace (`electron/`) houses the main process, preload bridge, and Forge configuration powered by `@electron-forge/plugin-vite`.
- Tests live alongside features (`*.test.tsx`) with shared fixtures in `src/test/`.

## Persistence and Data
- Browser builds persist editor and library state via `window.localStorage` helpers in `src/shared/state/persistence.ts`.
- Desktop builds expose a persistence bridge stub (see `electron/preload.ts`); filesystem-backed storage is tracked in issue #15.
- Canvas metadata captures timestamps and autosave provenance for each document entry.

## Debugging Tips
- Runtime console output is mirrored to the root `console.log`; check the newest timestamps after dev sessions to spot renderer or Electron errors quickly.
- `dev.log` surfaces Electron Forge output when running desktop commands.

## Roadmap and Open Issues
- #22 - CP437 glyph library font variants.
- #21 - Whole-group selection semantics.
- #20 - Refining glyph-library hover and selection styling.
- #19 - Precise glyph hit areas and stacked-selection cycling.
- #18 - Electron packaging follow-ups, including persistence and signing.
- #15 - Filesystem-backed editor persistence.
- #12 - Expanded regression test coverage for viewport and cursor behaviors.

See `docs/design-doc.md` for the broader product direction and UX concepts.
