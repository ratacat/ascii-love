# Design Log

## 2025-10-16 — Kickoff Notes
- **Context**: Need a creator tool for expressive ASCII/“assy” assets that feed a browser-based, React text game.
- **Goals surfaced**: Support portraits, landscapes, UI layouts (e.g., skill trees), and illuminated-style elements; enable reuse of assets beyond terminal environments.
- **Key capabilities discussed**: Layer/group management, colorization per group, palette libraries, animation controls (color cycling, transformations), potential WebGL interactivity, exportable asset libraries.
- **Existing leverage**: Current game library renders ASCII borders via SVG with color manipulation; could inform export or rendering approach.
- **Output format ideas**: SVG for vector-like control, Canvas, WebGL textures, custom intermediate format that exports into game-ready assets.
- **Early considerations**: Need to balance animation richness against browser performance; exploring WebGL for offloading heavy animations.
- **Questions to resolve**: How to structure intermediate data model? What level of WebGL integration is feasible? How to manage palettes/versioning? What file formats best serve both editing and runtime use?

## 2025-10-16 — Spatial Storytelling Context
- **Game direction**: Moving beyond terminal-style vertical text flow toward a 2D plane that slides between rooms, similar to isometric ARPG navigation.
- **Implications for assets**: ASCII elements must compose coherent scenes that pan/scroll; tiles, rooms, and transitional UI need to align seamlessly on a grid.
- **Tool impact**: Editor should preview spatial layouts across multiple viewports and support grouping assets into room-sized canvases with shared palettes.
- **Animation needs**: Support slide transitions and layered parallax or motion cues to sell room-to-room movement without overwhelming React rendering; consider WebGL-backed previews.
- **Open questions**: How to model room states and transitions within the asset format? Should assets carry metadata about anchors/exits to drive screen sliding logic?

## 2025-10-16 — Modular Editor + Glyph Handling
- **UI composition**: Favor a panel-based interface where modules (glyph palette, layer list, canvas view, metadata inspectors) can dock left/right/top/bottom and be resized; need shared terminology for these panels.
- **Glyph selection workflow**: Dedicated library panel with switchable sheets (CP-437, Unicode blocks, custom sets). Clicking a glyph arms the cursor for placement on the canvas.
- **Placement model**: Canvas is freeform—glyphs can overlap, ignore rigid rows/columns, and stack in layers. Editor must support precise positioning aids without enforcing a strict grid.
- **Transformations**: Require rotation, scaling, and color adjustments per glyph/group while preserving underlying glyph metadata for exports.
- **Color strategy**: Enable both locked/static palettes (for art) and tagged, externally addressable groups (for UI themes like day/night variants).
- **Animation posture**: Tool outputs static assets but should surface hooks (named groups, metadata) so WebGL/CSS animations can target glyph clusters later.
- **Open questions**: How do we tag glyph groups for runtime color overrides without interrupting the static art flow? What alignment/snapping aids replace the traditional grid to keep layouts tidy?

## 2025-10-16 — Windows, Hotkeys, and Interaction Modes
- **Terminology**: Leaning toward calling dockable modules “windows”; could support presets (e.g., “Illustration,” “UI Layout”) and user-saved arrangements.
- **Layout persistence**: Need per-user profile that auto-saves window positions/sizes and allows exporting/importing layout presets for collaboration.
- **Hotkey system**: Treat keyboard shortcuts as first-class—global command palette plus mode-specific bindings; roadmap includes key-remapping UI and profiles.
- **Cursor modes**: Identify baseline modes (draw/place glyph, selection/marquee, transform, pan/navigate). Consider mode HUD or status bar to reduce context loss.
- **Tool access**: Include a compact toolbar for mouse-driven mode switching while keeping hotkeys as the primary fast path.
- **Z-level controls**: Require straightforward depth ordering (raise/lower layer, send to front/back) with visual feedback in layers window.
- **Export focus**: Priority on defining runtime formats alongside the intermediate editor schema so assets flow cleanly into the game pipeline.
- **Questions to explore**: What event model underpins hotkey remapping? How do windows interact on smaller screens? What metadata must cursor modes attach to selections for exports?

## 2025-10-16 — Scope Discipline + Data Format Direction
- **Guiding principle**: Bias toward “functional minimum” over speculative features; build quickly to validate workflows, only harden systems (e.g., hotkeys) we know we need.
- **Window persistence**: Store per-user layout + preferences in a single TOML file under user data; sharing/export is out of scope for v1.
- **Hotkeys**: Command palette with layered bindings still planned, but remapping UI can arrive later—start with TOML-defined defaults that advanced users can edit manually.
- **Cursor modes**: Baseline modes confirmed (place, select, transform, navigate) with temporary override (e.g., hold Space to pan); refine UI overlays later.
- **Asset schema**: Adopt `.love.json` as editor source. Structure as `layers → glyphInstances` with `groups` referencing glyph IDs across layers so grouping isn’t layer-bound.
- **Export sequencing**: Target quick-win exporters first (SVG + `.love.json` loader). Defer heavier WebGL export until runtime requirements clarified.
- **Future flexibility**: Keep extension points in mind (e.g., exporter registry) but don’t implement plug-in architecture until multiple exporters truly demand it.

## 2025-10-16 — Responsive Scaling Questions
- **Runtime challenge**: Game must render assets across desktop and mobile with varied pixel densities; glyph size might need adaptive scaling.
- **Editor impact**: Need to define how glyph transforms capture intent (absolute px vs relative units) and how previews emulate different device scales.
- **Scaling modes**: Explore preserving aspect ratio with uniform scaling, directional scaling for UI stretch (e.g., width-only), and resolution-specific overrides.
- **Potential approach**: `.love.json` could store a base logical unit (e.g., 1 unit = 1 glyph cell) plus optional scale profiles for breakpoints.
- **Open questions**: How do we avoid blurry glyphs when scaling up/down? Do we support multiple rendered resolutions per asset (vector vs raster)? What metadata signals when runtime may safely scale an asset?

## 2025-10-16 — `.love.json` Schema Draft
- **Top-level**: `{ schemaVersion, meta, units, palettes, layers, glyphInstances, groups, guides? }`.
- **Meta**: Title, author, timestamps, notes for provenance.
- **Units**: Declare base logical unit (`glyph` or px), default pixels-per-unit, optional `scaleProfiles` keyed by breakpoint (`desktop`, `mobile`) defining uniform or axis-specific multipliers.
- **Palettes**: Map palette IDs to swatches; swatches can be hex colors or references to runtime theme keys.
- **Layers**: Ordered array, each with `id`, `name`, `visible`, `locked`, and optional blend info; glyph instances reference layers by ID.
- **GlyphInstances**: Array of `{ id, layerId, codePoint, position{x,y}, transform{scaleX, scaleY, rotation}, color{paletteId, swatchId?, direct?}, tags[] }`.
- **Groups**: Named sets spanning layers: `{ id, name, glyphIds[], runtimeFlags{themeTarget, animTarget}, tags[] }`.
- **Guides (optional)**: Store alignment aids (lines, snapping rules) without affecting export.
- **Open follow-ups**: Do we need per-glyph z-offset beyond layer order? How to encode runtime behaviors without bloating the file? What’s the minimal metadata to keep v1 lean?
- **Per-glyph metadata**: Defer custom fields beyond `id` and `tags` until specific use-cases emerge.

## 2025-10-16 — Positioning, Animation Scope, Canvas Terminology
- **Coordinate system**: `glyphInstances.position` stores logical (x, y) in declared `units.base`; origin is top-left by default with optional per-canvas overrides (e.g., center).
- **Canvas model**: Treat each saved `.love.json` as a “canvas”—an infinite workspace where multiple elements can coexist; exports may target the entire canvas or the current selection.
- **Transform intent**: Allow non-uniform scaling but encourage uniform transforms for clarity; metadata should signal if an element expects proportional scaling only.
- **Animation stance**: No timeline editor in v1; exports must carry enough metadata (groups, runtimeFlags, transforms) for the game to animate selections via WebGL/CSS.
- **WebGL preview**: No need for WebGL-specific preview in editor yet; focus on exporting data the runtime can consume.
- **Selection exports**: Need workflow to export selected glyphs/groups from the canvas without exporting the whole document—aligns with reuse of canvas as an asset bin.
- **Snapping MVP**: Start with toggleable crosshair at cursor origin, optional reference grid, and describe “snap-to-angle” as constraining rotation to increments (e.g., 15°) via modifier key.
- **Open questions**: Should canvases store selection-specific export presets? How do we capture scaling intent per group for responsive runtime behavior? When do we revisit exporter plug-in architecture?
- **Organization**: No named regions/frames in v1; users manage layout manually on the infinite canvas.

## 2025-10-16 — Selection Export Flow
- **User workflow**: Use selection cursor to marquee or click-select glyphs/groups (e.g., a “tiger” cluster), then invoke export on that selection.
- **Export options**: Early UI keeps it light—present default export type with optional dropdown for alternates plus an automatic padding toggle (with manual override later).
- **Implication**: Editor must surface selection context (counts, grouping) and remember recent export choice per session until a definitive default is chosen.

## 2025-10-16 — Export System Direction
- **Decision**: Support both SVG and `.love.json` exports from the start via a modular exporter architecture.
- **Implementation note**: Begin with a hardcoded registry mapping export types to handlers; avoid config-based or plug-in systems until more formats emerge.
- **Workflow impact**: Selection export dialog should expose both options (with the previously used choice highlighted); full canvas export uses the same mechanism.
- **Open follow-ups**: Define minimal API each exporter implements (input selection, options, output path), and plan how to add WebGL/raster exporters later without refactoring.

## 2025-10-16 — Canvas Origin Thoughts
- **Current stance**: Default origin remains top-left for familiarity; exporting formats normalize coordinates so origin choice stays internal to the editor.
- **Future option**: Consider per-canvas origin overrides if editing workflows demand it (e.g., centered rotation), but not required for v1.
- **Open question**: What editing scenarios would benefit from a non-top-left origin enough to justify UI for it?

## 2025-10-16 — Palette Versioning Decision
- **MVP approach**: Palettes live inline within each canvas (`.love.json`) with no version history.
- **Implication**: Editing a palette updates it in-place; any cross-canvas reuse is manual (copy/paste or future tooling).
- **Future consideration**: Only introduce shared palette files or snapshots once collaboration or large libraries demand it.

## 2025-10-16 — Platform & Framework Considerations
- **Requirements**: macOS desktop app that is easy to build locally, leverages JavaScript/TypeScript familiarity, and aligns with well-documented/AI-friendly tooling.
- **React + Electron**: Maximum reuse of existing React knowledge, wide community support, straightforward Canvas/WebGL integration; tradeoff is heavier footprint (Chromium runtime).
- **React + Tauri**: Similar UI stack with dramatically smaller bundle; introduces Rust toolchain complexity but still mainstream and well-documented.
- **Native macOS (SwiftUI/AppKit)**: Excellent system integration and performance; significantly higher ramp-up cost and limits collaboration leverage with JavaScript ecosystem.
- **Game engine toolkits (Godot/Unity)**: Powerful rendering/animation, but mismatched with editor-style workflows and export formats.
- **Provisional lean**: Start with Electron (or evaluate Tauri for footprint later) to get velocity while keeping the option to revisit once MVP lessons surface.
- **Native path recap**: If we go fully native, SwiftUI + Metal for rendering (with AppKit interop where needed) is the modern macOS stack, but it requires learning Swift and dealing with more bespoke tooling.
