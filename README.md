# ascii-love

A freeform ASCII editor built with Vite + React. The project started from the ASCII Asset Studio scaffold and is evolving toward a layered, palette-aware canvas that supports free placement of glyphs, quick color swatching, and exporter tooling.

## Getting Started

```bash
npm install
npm run dev
```

### Useful Scripts

- `npm run build` – Type-check and create a production build.
- `npm run lint` – Run ESLint across the project.
- `npm run typecheck` – Run the TypeScript compiler without emitting files.
- `npm test` – Execute the Vitest suite in headless mode.
- `npm run test:e2e` – Run Playwright end-to-end tests.

## Project Structure

```
src/
  app/                Application shell composition
  features/           Feature slices (canvas, toolbar, palettes, etc.)
  shared/             Cross-cutting state, types, constants, and UI primitives
  test/               Shared Vitest helpers and fixtures
```

## Current Focus Areas

- **Freeform canvas**: place glyphs anywhere with per-glyph color data, snapping, and live cursor previews.
- **Palette management**: tile-based swatch picker, color editing, and persistent palette state.
- **Exporters**: SVG and `.love.json` generation for sharing and automation.
- **Keyboard workflows**: Hotkeys for cursor modes, grid toggles, and future command palette integrations.

## Roadmap

1. Expand document persistence and importer/exporter coverage.
2. Add transformation and selection tools for editing existing glyphs.
3. Wire undo/redo history across canvas and palette operations.
4. Introduce collaborative and multi-document workflows.

See `docs/design-doc.md` for the original ASCII Asset Studio vision and broader product direction.
