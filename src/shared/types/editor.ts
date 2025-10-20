export type CursorMode = 'place' | 'select' | 'transform' | 'pan'

export interface Vec2 {
  x: number
  y: number
}

export interface GlyphTransform {
  translation: Vec2
  scale: Vec2
  rotation: number
}

export interface GlyphInstance {
  id: string
  char: string
  position: Vec2
  transform: GlyphTransform
  paletteId: string
  swatchId?: string
  groupIds: string[]
  locked: boolean
  foreground?: string
  background?: string
}

export interface CanvasLayer {
  id: string
  name: string
  glyphs: GlyphInstance[]
  visible: boolean
  locked: boolean
  zIndex: number
}

export interface GlyphGroup {
  id: string
  name: string
  glyphIds: string[]
  tags: string[]
  addressableKey?: string
  description?: string
}

export interface PaletteSwatch {
  id: string
  name: string
  foreground: string
  background?: string
  accent?: string
  locked?: boolean
}

export interface Palette {
  id: string
  name: string
  swatches: PaletteSwatch[]
  locked: boolean
  mutable: boolean
  description?: string
}

export interface AnimationHint {
  id: string
  name: string
  type: 'color-cycle' | 'pulse' | 'swap' | 'slide'
  targetGroupIds: string[]
  parameters: Record<string, unknown>
}

export interface CanvasDocument {
  id: string
  name: string
  width: number
  height: number
  layers: CanvasLayer[]
  groups: GlyphGroup[]
  palettes: Palette[]
  animationHints: AnimationHint[]
  metadata: Record<string, unknown>
}

export interface SelectionState {
  glyphIds: string[]
  groupIds: string[]
  layerIds: string[]
  bounds?: {
    min: Vec2
    max: Vec2
  }
}

export type PanelId = 'layers' | 'glyphLibrary' | 'inspector' | 'palette'

export interface PanelState {
  id: PanelId
  visible: boolean
}

export type LayoutPreset = 'classic' | 'reference' | 'animation'

export interface LayoutState {
  activePreset: LayoutPreset
  panels: Record<PanelId, PanelState>
}

export interface CursorState {
  mode: CursorMode
  snapped: boolean
  gridEnabled: boolean
  crosshairEnabled: boolean
  rotation: number
}

export interface EditorPreferences {
  showGrid: boolean
  showCrosshair: boolean
  autoGroupSelection: boolean
}

export interface ViewportState {
  offset: Vec2
  scale: number
}

export interface EditorState {
  document: CanvasDocument
  cursor: CursorState
  selection: SelectionState
  layout: LayoutState
  preferences: EditorPreferences
  viewport: ViewportState
  activeGlyphChar?: string
  activePaletteId?: string
  activeSwatchId?: string
  activeLayerId?: string
  activeColor: string
}
