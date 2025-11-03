# ASCII Love — Working PRD

## Problem Statement
Create a browser-based tool that produces expressive ASCII (“assy”) art assets suitable for a React text-adventure game, spanning portraits, environmental illustrations, and fully composed UI screens.

## Primary Objectives
- Allow designers to compose ASCII assets outside terminal constraints, with fine-grained control over layout, grouping, and styling.
- Support export paths compatible with the existing game pipeline (e.g., SVG-based borders) while remaining open to Canvas/WebGL-driven experiences.
- Enable layering, recoloring, and animation workflows so assets can be repurposed across multiple in-game contexts.

## Non-Goals (for now)
- Full runtime integration with the game client.
- Procedural asset generation or AI-assisted drawing.
- Rich WYSIWYG WebGL scene editor; focus on 2D ASCII composition first.

## Target Users
- Primary: The game’s designer/developer (solo or small team) crafting bespoke ASCII assets.
- Secondary: Collaborators contributing art or UI screens who need consistent palettes and export formats.

## Example Use Cases
- Design an illuminated manuscript-style UI overlay for a lore codex screen.
- Build a branching skill-tree interface with grouped nodes that can be highlighted independently.
- Produce animated character portraits with subtle color cycling accents.

## Core Requirements (Draft)
- Freeform canvas with layer/group management, optional alignment aids, and palette assignment.
- Dockable panel system so glyph libraries, layer lists, inspectors, and canvases can be rearranged per workflow.
- Dedicated glyph library panel with switchable sheets (CP-437, Unicode ranges, custom sets) and click-to-place workflow.
- Ability to apply color transforms per glyph/group and preview optional animations (color shifts, transitions).
- Transform tools for rotation, scaling, and stacking while preserving glyph metadata for exports.
- Window layout persistence stored per user (local TOML config; no sharing in v1).
- Comprehensive hotkey system with mode-aware bindings and planned remapping UI.
- Clear cursor interaction modes (place, select, transform, pan) with status/indicator feedback.
- Compact toolbar mirrors cursor modes for mouse users while hotkeys remain the primary fast path.
- Z-level controls for glyphs/layers (raise/lower, front/back) exposed through UI and shortcuts.
- Exporters for at least SVG and a game-native data format; consider Canvas/WebGL hooks.
- Modular export system that can handle multiple formats (initially SVG and `.love.json`) via a shared registry.
- Palette library management, including reusable symbol sets.
- Palettes stored inline within each canvas for MVP; no version history until sharing needs arise.
- File persistence that separates editable source (intermediate format) from runtime exports.

## UX Concepts (Draft)
- Panel layout presets (e.g., right-side glyph sheet, left-side layers) with drag/dock customization.
- Freeform placement canvas that supports overlapping glyphs, layer visibility toggles, and metadata tagging.
- Inspector allowing groups to be marked as externally addressable (e.g., `dayNightPalette`, `skillHighlight`) for runtime overrides.
- Palette manager for defining locked palettes versus mutable theme-aware palettes.
- Animation preview mode that simulates slide transitions or color pulses using tagged groups without deep animation authoring.
- Hotkey overlay or command palette for discoverability and quick binding reference.
- Cursor mode HUD/status bar showing active tool, modifiers, and target metadata.
- Selection export dialog triggered from active selection with lightweight options (default export type plus optional alternates).
- Export chooser should remember the last-used format and list available exporters from the registry.
- Provide automatic padding around selection exports with a simple toggle; manual padding controls can follow later.
- Toggleable crosshair and lightweight reference grid for visual alignment (grid optional, no hard snap in MVP).

## Design Principles
- Deliver a playable v1 quickly; ship the smallest useful feature set and iterate from real use.
- Invest early only where experience says it pays off (e.g., hotkey architecture); keep other subsystems simple and replaceable.
- Prefer plain-text local configuration (TOML) before introducing sync/sharing infrastructure.
- Operate as a standalone tool that hands off assets via exports to the game pipeline.
- Support large canvases that can hold multiple elements; allow exporting either the full canvas or a user selection.

## Technical Considerations
- Browser performance: heavier animation previews may require WebGL acceleration.
- Compatibility with existing SVG border library; identify shared abstractions.
- Define `.love.json` intermediate representation capturing layers, glyph instances, cross-layer groups, transforms, and optional animation hints.
- Need metadata schema so runtime systems can target glyph groups for color/theme changes without bloating static art workflows.
- Potential to integrate WebGL pipelines for animated playback without forcing runtime adoption.
- WebGL preview inside the editor can wait; initial goal is to export data the runtime consumes.
- Store user preferences (window layouts, hotkeys, palette picks) in per-user TOML under the app’s user-data directory.
- Handle responsive scaling: define how glyph units map to device pixels, provide preview breakpoints, and prevent blurring on high/low DPI screens.
- Include a `schemaVersion` field in `.love.json` so future revisions remain backward compatible.
- Support animation hooks via metadata (e.g., tagged groups, transforms) without shipping an in-editor animation timeline in v1.
- Design exporter registry with clean interfaces so adding WebGL/raster handlers later doesn’t require core refactors; initial registry is hardcoded in the app.
- Favor a web-tech desktop shell (initially React + Electron) to capitalize on existing JS/TS expertise; reassess alternatives like Tauri once MVP goals are met.
- Use Vite + React + TypeScript for the renderer code; Electron’s Node-enabled main/preload processes handle file dialogs and reading/writing `.love.json` and exports.
- Begin with manual save/load (no autosave) and local file storage; revisit autosave/versioning after MVP proves the workflow.

## `.love.json` Schema (Draft)
- **Top-level fields**: `schemaVersion`, `meta`, `units`, `palettes`, `layers`, `glyphInstances`, `groups`, optional `guides`.
- **Meta**: Asset title, author, timestamps, notes.
- **Units**: Base logical unit (`glyph`), default pixels-per-unit, optional `scaleProfiles` keyed by device class (e.g., `desktop`, `mobile`) with uniform/axis multipliers and allowlists for runtime scaling.
- **Palettes**: Map palette IDs to swatches; each swatch either hard-codes a color or references a runtime theme token.
- **Layers**: Ordered array containing `id`, `name`, `visible`, `locked`, optional blend or opacity; glyph instances reference their parent layer via `layerId`.
- **GlyphInstances**: `{ id, layerId, codePoint, position { x, y }, transform { scaleX, scaleY, rotation }, color { paletteId, swatchId?, direct? }, tags[] }`; `position` values are in `units.base` with optional per-canvas origin overrides (e.g., center origin for symmetrical layouts).
- **Per-glyph metadata**: Keep to IDs and tags for v1; introduce additional fields only when concrete needs arise.
- **Groups**: Collections spanning layers with `runtimeFlags` (e.g., `{ "themeTarget": true, "animTarget": false }`) and references to member glyph IDs.
- **Guides (optional)**: Alignment lines or snap rules for the editor; ignored by runtime exporters.

```json
{
  "schemaVersion": 1,
  "meta": { "title": "skill-tree", "author": "jared", "createdAt": "2025-10-16T23:05:00Z" },
  "units": {
    "base": "glyph",
    "pixelsPerUnit": 16,
    "scaleProfiles": {
      "desktop": { "scale": { "x": 1, "y": 1 } },
      "mobile": { "scale": { "x": 0.8, "y": 0.8 }, "allowRuntimeScaling": true }
    }
  },
  "palettes": {
    "main": {
      "type": "locked",
      "swatches": { "primary": "#c0ffee", "accent": "theme:skill-accent" }
    }
  },
  "layers": [
    { "id": "layer-base", "name": "Base", "visible": true, "locked": false, "order": 0 }
  ],
  "glyphInstances": [
    {
      "id": "g-1",
      "layerId": "layer-base",
      "codePoint": "U+256C",
      "position": { "x": 0, "y": 0 },
      "transform": { "scaleX": 1, "scaleY": 1, "rotation": 0 },
      "color": { "paletteId": "main", "swatchId": "primary" },
      "tags": ["node", "root"]
    }
  ],
  "groups": [
    {
      "id": "skill-nodes",
      "name": "Skill Nodes",
      "glyphIds": ["g-1"],
      "runtimeFlags": { "themeTarget": true, "animTarget": true }
    }
  ]
}
```

## Export Format Options (Exploratory)
- **SVG Sprites**: Preserve vector fidelity and per-group styling; aligns with existing border tooling; may require careful z-order encoding when glyphs overlap heavily.
- **`.love.json` Scene Graph**: Canonical source describing glyph instances, transforms, z-levels, palette references, and named groups (groups can span layers); runtime renderer (React/Canvas/WebGL) interprets it directly.
- **Raster Atlas (PNG/WebP + metadata)**: Optional optimization that rasterizes layers or entire assets with accompanying metadata for hit areas/groups; ideal for static backgrounds but sacrifices dynamic recoloring.
- **WebGL Draw Data**: Derived export that converts `.love.json` into instanced vertex buffers + palette lookup tables for high-performance animation; defer until the WebGL runtime path is clearer.
- **Hybrid Approach**: Maintain `.love.json` as source and add exporters as needed; keep hooks for future plug-ins without implementing the system prematurely.

## Open Questions
- What is the MVP scope for animation controls?
- How should palettes be versioned and shared across projects?
- Do we need a plugin system for custom exporters?
- What alignment/snapping aids keep freeform canvases tidy without reintroducing a strict grid?
- How do we balance static art creation with the need to tag glyphs for runtime theming or interactivity?
- Which export format best balances readability, performance, and animation hooks for the game’s runtime?
- When should we introduce an extensibility point for additional exporters without overbuilding v1?
- How do we encode scaling intents (uniform vs axis-specific) so runtime can adapt assets across desktop and mobile?
- How should selection-only exports be described/configured to keep workflows simple?
- Which exporter should be the default choice presented in the selection export dialog?
- What lightweight canvas-organization aids might we add later (frames, labels) if users need them?

## Implementation Phasing (Draft)
1. **MVP**: `.love.json` save/load, SVG export, fixed window layout with local persistence, basic place/select modes, default hotkeys.
2. **Editor Polish**: Transform mode, z-level UI, palette manager, command palette, mode HUD.
3. **Runtime Integration**: Game-side `.love.json` loader, optional raster exporter, initial theming hooks.
4. **Advanced Rendering**: WebGL draw-data exporter, animation preview enhancements, hotkey remapping UI.
