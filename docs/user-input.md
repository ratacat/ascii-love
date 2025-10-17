# User Input Summary

## Initial Vision
- Designing a text-based game (React app) that needs expressive ASCII (“assy”) art assets for portraits, landscapes, UI elements (e.g., skill trees), illuminated manuscript-style pages, and full screens.
- Wants a separate application to create these assets, supporting use beyond terminal contexts, with colorization, layering, grouping, and animation hooks.
- Interested in leveraging WebGL for performance-heavy animations and possibly exporting assets as SVG, Canvas, or WebGL resources.
- Existing game library can render ASCII borders via SVG with color manipulation; this could inform output options.
- Prefers an intermediate data format that can export to game-friendly formats and support palette and symbol libraries.

## Spatial Storytelling Direction
- Exploring a 2D plane text-game layout where the view slides between rooms (ARPG style), requiring assets that align during pans and transitions.
- Wonders how to model room transitions and whether assets should include metadata about anchors/exits for sliding logic.

## Editor Interface Concepts
- Envisions modular panels (“windows”) for glyph sheets, layers, canvas, etc., dockable around the workspace.
- Wants a right-side scrollable glyph library with switchable character sheets (CP-437, Unicode, custom sets) that loads glyphs into the cursor for placement.
- Prefers a freeform canvas without rigid grids, allowing overlapping glyphs, rotations, scaling, and color adjustments.
- Important to target specific glyph groups for runtime color changes (e.g., day/night themes) while keeping static art simple.
- Sees animation as runtime-driven; the editor should expose hooks (layers/groups) but not necessarily become an animation editor.

## Tooling and Workflow Priorities
- Adopt the term “window” for dockable modules; store layout preferences per user and allow saving layout presets later.
- Build a strong hotkey system with a command palette and eventual remapping UI; cursor modes include place, select, transform, and navigate (with temporary overrides like holding Space to pan).
- Implement z-level controls and focus on defining runtime export formats alongside the editor schema.
- Emphasize minimal viable implementation—deliver something functional quickly, harden systems only when proven necessary, and avoid over-engineering.
- Store user preferences (layouts, hotkeys, palettes) in a local TOML file; users can copy it manually if needed.

## Canvas and Export Expectations
- Treat each `.love.json` file as an infinite canvas containing multiple elements; allow exporting the entire canvas or a selection.
- Selection exports should be driven by marquee/select tools and offer both SVG and `.love.json` outputs via a simple, hardcoded exporter registry.
- Include automatic padding around selection exports (with optional manual override later) and remember the last used exporter.
- Provide basic snapping aids: toggleable crosshair at the cursor and an optional reference grid; no additional organization tools in v1.
- Origin can remain top-left; other origins can be considered later if editing workflows demand it.

## Schema and Palette Decisions
- `.love.json` schema should cover layers, glyph instances, groups, palettes, transforms, and scale profiles; per-glyph metadata stays limited to IDs and tags until needed.
- Palettes live inline in each canvas with no version history for now; shared palettes or snapshots can come later when collaboration requires it.

## WebGL and Runtime Considerations
- Interested in WebGL for runtime animation and interaction, but the editor does not need a WebGL preview initially—exporting structured data is sufficient.
- Wants assurances that exported assets can be animated or recolored in the game via WebGL/CSS based on tagged groups and metadata.
