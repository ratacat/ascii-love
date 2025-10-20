import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import type {
  CanvasDocument,
  CanvasLayer,
  CursorMode,
  EditorPreferences,
  EditorState,
  GlyphGroup,
  GlyphInstance,
  LayoutPreset,
  LayoutState,
  PanelId,
  SelectionState,
  Vec2,
  Palette,
  PaletteSwatch,
} from '@shared/types/editor'
import { BASE_UNIT_PX } from '@shared/constants/canvas'

const DEFAULT_GLYPH = '▒'
const MIN_VIEWPORT_SCALE = 0.25
const MAX_VIEWPORT_SCALE = 6

const LAYOUT_PRESET_VISIBILITY: Record<LayoutPreset, Partial<Record<PanelId, boolean>>> = {
  classic: {
    layers: true,
    glyphLibrary: true,
    inspector: true,
    palette: true,
  },
  reference: {
    layers: true,
    glyphLibrary: true,
    inspector: false,
    palette: true,
  },
  animation: {
    layers: true,
    glyphLibrary: false,
    inspector: true,
    palette: true,
  },
}

const normalizeAngle = (angle: number): number => {
  const normalized = angle % 360
  return normalized < 0 ? normalized + 360 : normalized
}

const clampScale = (scale: number): number =>
  Math.min(MAX_VIEWPORT_SCALE, Math.max(MIN_VIEWPORT_SCALE, scale))

const generateId = (prefix: string): string => {
  const sanitized = prefix.replace(/\s+/g, '-').toLowerCase() || 'id'
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${sanitized}-${crypto.randomUUID()}`
  }

  return `${sanitized}-${Math.random().toString(36).slice(2, 10)}`
}

const createBaseLayer = (): CanvasLayer => ({
  id: generateId('layer'),
  name: 'Base Layer',
  glyphs: [],
  visible: true,
  locked: false,
  zIndex: 0,
})

const createDefaultPalette = (): Palette => ({
  id: generateId('palette'),
  name: 'Default Palette',
  locked: false,
  mutable: true,
  description: 'Starter palette seeded with neutral foreground/background pairs.',
  swatches: [
    {
      id: generateId('swatch'),
      name: 'Primary Foreground',
      foreground: '#F7F7F7',
      background: '#111111',
    },
    {
      id: generateId('swatch'),
      name: 'Accent Highlight',
      foreground: '#FFD166',
      background: '#111111',
    },
    {
      id: generateId('swatch'),
      name: 'Shadow',
      foreground: '#3A3A3A',
      background: '#111111',
    },
  ],
})

const createInitialDocument = (): CanvasDocument => {
  const layer = createBaseLayer()
  const palette = createDefaultPalette()

  return {
    id: generateId('document'),
    name: 'Untitled Canvas',
    width: 80,
    height: 40,
    layers: [{ ...layer, zIndex: 0 }],
    groups: [],
    palettes: [palette],
    animationHints: [],
    metadata: {
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
    },
  }
}

const getPaletteById = (document: CanvasDocument, paletteId?: string): Palette | undefined =>
  paletteId ? document.palettes.find((palette) => palette.id === paletteId) : undefined

const getDefaultSwatchId = (document: CanvasDocument, paletteId?: string): string | undefined => {
  const palette = getPaletteById(document, paletteId)
  return palette?.swatches[0]?.id
}

const syncActiveColor = (state: EditorState) => {
  const selectionIds = state.selection.glyphIds
  if (selectionIds.length) {
    const firstGlyph = getGlyphById(state.document, selectionIds[0])
    const glyphColor = normalizeColor(firstGlyph?.foreground)
    if (glyphColor) {
      state.activeColor = glyphColor
      const palette = getPaletteById(state.document, state.activePaletteId)
      const matchingSwatch = palette?.swatches.find(
        (swatch) => normalizeColor(swatch.foreground) === glyphColor,
      )
      state.activeSwatchId = matchingSwatch?.id ?? state.activeSwatchId
      return
    }
  }

  const palette = getPaletteById(state.document, state.activePaletteId) ?? state.document.palettes[0]
  if (!palette) {
    state.activeColor = '#FFFFFF'
    return
  }

  const swatch = palette.swatches.find((item) => item.id === state.activeSwatchId) ?? palette.swatches[0]
  const paletteColor = normalizeColor(swatch?.foreground)
  if (paletteColor) {
    state.activeColor = paletteColor
    state.activeSwatchId = swatch?.id ?? state.activeSwatchId
  }
}

const computeSelectionBounds = (
  document: CanvasDocument,
  glyphIds: SelectionState['glyphIds'],
): SelectionState['bounds'] => {
  if (!glyphIds.length) {
    return undefined
  }

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const layer of document.layers) {
    for (const glyph of layer.glyphs) {
      if (!glyphIds.includes(glyph.id)) {
        continue
      }

      minX = Math.min(minX, glyph.position.x)
      minY = Math.min(minY, glyph.position.y)
      maxX = Math.max(maxX, glyph.position.x)
      maxY = Math.max(maxY, glyph.position.y)
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return undefined
  }

  return {
    min: { x: minX, y: minY },
    max: { x: maxX, y: maxY },
  }
}

const uniqueLayerIdsForGlyphs = (
  document: CanvasDocument,
  glyphIds: SelectionState['glyphIds'],
): string[] => {
  const layerSet = new Set<string>()

  for (const layer of document.layers) {
    for (const glyph of layer.glyphs) {
      if (glyphIds.includes(glyph.id)) {
        layerSet.add(layer.id)
      }
    }
  }

  return Array.from(layerSet)
}

const deriveGroupIdsForGlyphs = (
  document: CanvasDocument,
  glyphIds: SelectionState['glyphIds'],
): string[] => {
  const groupSet = new Set<string>()
  document.groups.forEach((group) => {
    if (group.glyphIds.some((glyphId) => glyphIds.includes(glyphId))) {
      groupSet.add(group.id)
    }
  })
  return Array.from(groupSet)
}

const findLayerIndex = (document: CanvasDocument, layerId: string): number =>
  document.layers.findIndex((layer) => layer.id === layerId)

const findGlyphEntry = (
  document: CanvasDocument,
  glyphId: string,
): { layerIndex: number; glyphIndex: number } | undefined => {
  for (let layerIndex = 0; layerIndex < document.layers.length; layerIndex += 1) {
    const glyphIndex = document.layers[layerIndex].glyphs.findIndex((glyph) => glyph.id === glyphId)
    if (glyphIndex !== -1) {
      return { layerIndex, glyphIndex }
    }
  }

  return undefined
}

const normalizeColor = (value?: string): string | undefined => {
  if (!value) {
    return undefined
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }
  let candidate = trimmed.startsWith('#') ? trimmed : `#${trimmed}`
  if (/^#[0-9a-fA-F]{3}$/.test(candidate)) {
    const [, r, g, b] = candidate
    candidate = `#${r}${r}${g}${g}${b}${b}`
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(candidate)) {
    return undefined
  }
  return candidate.toUpperCase()
}

const getGlyphById = (document: CanvasDocument, glyphId: string): GlyphInstance | undefined => {
  const entry = findGlyphEntry(document, glyphId)
  if (!entry) {
    return undefined
  }
  return document.layers[entry.layerIndex].glyphs[entry.glyphIndex]
}

const recalcSelectionMeta = (draft: EditorState) => {
  draft.selection.bounds = computeSelectionBounds(draft.document, draft.selection.glyphIds)
  draft.selection.layerIds = uniqueLayerIdsForGlyphs(draft.document, draft.selection.glyphIds)
}

const applyLayoutPresetVisibility = (layout: LayoutState, preset: LayoutPreset) => {
  const visibility = LAYOUT_PRESET_VISIBILITY[preset]
  for (const panelId of Object.keys(layout.panels) as PanelId[]) {
    const panelVisibility = visibility[panelId]
    layout.panels[panelId].visible =
      panelVisibility ?? LAYOUT_PRESET_VISIBILITY.classic[panelId] ?? layout.panels[panelId].visible
  }
}

const initialDocument = createInitialDocument()
const initialPalette = initialDocument.palettes[0]
const initialColor = normalizeColor(initialPalette?.swatches[0]?.foreground) ?? '#FFFFFF'
const initialState: EditorState = {
  document: initialDocument,
  cursor: {
    mode: 'select',
    snapped: false,
    gridEnabled: false,
    crosshairEnabled: true,
    rotation: 0,
  },
  selection: {
    glyphIds: [],
    groupIds: [],
    layerIds: initialDocument.layers[0] ? [initialDocument.layers[0].id] : [],
  },
  layout: {
    activePreset: 'classic',
    panels: {
      layers: { id: 'layers', visible: true },
      glyphLibrary: { id: 'glyphLibrary', visible: true },
      inspector: { id: 'inspector', visible: true },
      palette: { id: 'palette', visible: true },
    },
  },
  preferences: {
    showGrid: false,
    showCrosshair: true,
    autoGroupSelection: true,
  },
  viewport: {
    offset: { x: 0, y: 0 },
    scale: 1,
  },
  activeGlyphChar: DEFAULT_GLYPH,
  activePaletteId: initialPalette?.id,
  activeSwatchId: initialPalette?.swatches[0]?.id,
  activeLayerId: initialDocument.layers[0]?.id,
  activeColor: initialColor,
}

export interface EditorStore extends EditorState {
  setCursorMode: (mode: CursorMode) => void
  togglePanelVisibility: (panelId: PanelId) => void
  setLayoutPreset: (preset: LayoutPreset) => void
  loadLayoutFromPersistence: (layout: LayoutState) => void
  setActiveLayer: (layerId: string) => void
  setActivePalette: (paletteId: string) => void
  setActiveSwatch: (swatchId?: string) => void
  setActiveGlyph: (glyphChar?: string) => void
  setPreferences: (preferences: Partial<EditorPreferences>) => void
  panViewport: (delta: Vec2) => void
  zoomViewport: (scaleFactor: number, anchor?: Vec2) => void
  setCursorRotation: (rotation: number) => void
  nudgeCursorRotation: (deltaDegrees: number) => void
  toggleGrid: () => void
  toggleSnapping: () => void
  setActiveColor: (color: string) => void
  applyColorToSelection: (color: string) => void
  updateSwatch: (paletteId: string, swatchId: string, updates: Partial<Omit<PaletteSwatch, 'id'>>) => void
  addSwatch: (
    paletteId: string,
    swatch: Pick<PaletteSwatch, 'foreground'> & Partial<Pick<PaletteSwatch, 'name' | 'background' | 'accent'>>,
  ) => void
  removeSwatch: (paletteId: string, swatchId: string) => void
  placeGlyph: (position: Vec2, options?: Partial<Pick<GlyphInstance, 'char' | 'paletteId' | 'swatchId'>>) => void
  updateGlyphPosition: (glyphId: string, position: Vec2) => void
  removeGlyph: (glyphId: string) => void
  selectGlyphs: (glyphIds: SelectionState['glyphIds'], options?: { additive?: boolean }) => void
  clearSelection: () => void
  setSelection: (selection: Partial<SelectionState>) => void
  addLayer: (name?: string) => void
  moveLayer: (layerId: string, direction: 'up' | 'down') => void
  renameLayer: (layerId: string, name: string) => void
  toggleLayerVisibility: (layerId: string) => void
  createGroupFromSelection: (payload: { name: string; addressableKey?: string }) => void
  updateGroup: (groupId: string, updates: Partial<Omit<GlyphGroup, 'id' | 'glyphIds'>>) => void
  deleteGroup: (groupId: string) => void
  setDocumentName: (name: string) => void
  setDocumentDimensions: (dimensions: { width: number; height: number }) => void
  resetDocument: (document?: CanvasDocument) => void
}

export const useEditorStore = create<EditorStore>()(
  immer((set) => ({
    ...initialState,
    setCursorMode: (mode) =>
      set((draft) => {
        draft.cursor.mode = mode
      }),
    togglePanelVisibility: (panelId) =>
      set((draft) => {
        const panel = draft.layout.panels[panelId]
        if (panel) {
          panel.visible = !panel.visible
        }
      }),
    setLayoutPreset: (preset) =>
      set((draft) => {
        draft.layout.activePreset = preset
        applyLayoutPresetVisibility(draft.layout, preset)
      }),
    loadLayoutFromPersistence: (layout) =>
      set((draft) => {
        draft.layout.activePreset = layout.activePreset
        ;(Object.keys(draft.layout.panels) as PanelId[]).forEach((panelId) => {
          const persisted = layout.panels[panelId]
          if (persisted) {
            draft.layout.panels[panelId].visible = persisted.visible
          }
        })
        draft.layout.panels.palette.visible = true
      }),
    setActiveLayer: (layerId) =>
      set((draft) => {
        draft.activeLayerId = layerId
        draft.selection.layerIds = [layerId]
      }),
    setActivePalette: (paletteId) =>
      set((draft) => {
        draft.activePaletteId = paletteId
        draft.activeSwatchId = getDefaultSwatchId(draft.document, paletteId)
        syncActiveColor(draft)
      }),
    setActiveSwatch: (swatchId) =>
      set((draft) => {
        draft.activeSwatchId = swatchId
        if (swatchId) {
          const palette = getPaletteById(draft.document, draft.activePaletteId)
          const swatch = palette?.swatches.find((item) => item.id === swatchId)
          const color = normalizeColor(swatch?.foreground)
          if (color) {
            draft.activeColor = color
          }
        } else {
          syncActiveColor(draft)
        }
      }),
    setActiveColor: (color) =>
      set((draft) => {
        const normalized = normalizeColor(color)
        if (!normalized) {
          return
        }
        draft.activeColor = normalized
        const palette = getPaletteById(draft.document, draft.activePaletteId)
        const matchingSwatch = palette?.swatches.find(
          (swatch) => normalizeColor(swatch.foreground) === normalized,
        )
        draft.activeSwatchId = matchingSwatch?.id ?? draft.activeSwatchId
      }),
    applyColorToSelection: (color) =>
      set((draft) => {
        const normalized = normalizeColor(color)
        if (!normalized) {
          return
        }
        const palette = getPaletteById(draft.document, draft.activePaletteId)
        const matchingSwatch = palette?.swatches.find(
          (swatch) => normalizeColor(swatch.foreground) === normalized,
        )

        draft.selection.glyphIds.forEach((glyphId) => {
          const entry = findGlyphEntry(draft.document, glyphId)
          if (!entry) {
            return
          }
          const glyph = draft.document.layers[entry.layerIndex].glyphs[entry.glyphIndex]
          glyph.foreground = normalized
          glyph.swatchId = matchingSwatch?.id
        })

        draft.activeColor = normalized
        if (matchingSwatch) {
          draft.activeSwatchId = matchingSwatch.id
        }
        syncActiveColor(draft)
      }),
    setActiveGlyph: (glyphChar) =>
      set((draft) => {
        draft.activeGlyphChar = glyphChar
      }),
    setPreferences: (preferences) =>
      set((draft) => {
        draft.preferences = { ...draft.preferences, ...preferences }
        draft.cursor.gridEnabled = draft.preferences.showGrid
        draft.cursor.crosshairEnabled = draft.preferences.showCrosshair
      }),
    panViewport: (delta) =>
      set((draft) => {
        draft.viewport.offset.x += delta.x
        draft.viewport.offset.y += delta.y
      }),
    zoomViewport: (scaleFactor, anchor) =>
      set((draft) => {
        if (!Number.isFinite(scaleFactor) || scaleFactor === 0) {
          return
        }
        const currentScale = draft.viewport.scale
        const nextScale = clampScale(currentScale * scaleFactor)
        if (nextScale === currentScale) {
          return
        }

        if (anchor) {
          const { offset } = draft.viewport
          const unit = BASE_UNIT_PX
          const contentX = (anchor.x - offset.x) / (unit * currentScale)
          const contentY = (anchor.y - offset.y) / (unit * currentScale)
          draft.viewport.offset.x = anchor.x - contentX * unit * nextScale
          draft.viewport.offset.y = anchor.y - contentY * unit * nextScale
        }

        draft.viewport.scale = nextScale
      }),
    setCursorRotation: (rotation) =>
      set((draft) => {
        draft.cursor.rotation = normalizeAngle(rotation)
      }),
    nudgeCursorRotation: (deltaDegrees) =>
      set((draft) => {
        draft.cursor.rotation = normalizeAngle(draft.cursor.rotation + deltaDegrees)
      }),
    toggleGrid: () =>
      set((draft) => {
        const next = !draft.cursor.gridEnabled
        draft.cursor.gridEnabled = next
        draft.preferences.showGrid = next
      }),
    toggleSnapping: () =>
      set((draft) => {
        draft.cursor.snapped = !draft.cursor.snapped
      }),
    updateSwatch: (paletteId, swatchId, updates) =>
      set((draft) => {
        const palette = getPaletteById(draft.document, paletteId)
        if (!palette) {
          return
        }
        const swatchIndex = palette.swatches.findIndex((swatch) => swatch.id === swatchId)
        if (swatchIndex === -1) {
          return
        }
        const swatch = palette.swatches[swatchIndex]
        const next = { ...swatch }
        if (updates.name !== undefined) {
          next.name = updates.name
        }
        if (updates.foreground !== undefined) {
          const normalized = normalizeColor(updates.foreground)
          if (normalized) {
            next.foreground = normalized
          }
        }
        if (updates.background !== undefined) {
          next.background = updates.background
        }
        if (updates.accent !== undefined) {
          next.accent = updates.accent
        }
        palette.swatches[swatchIndex] = next

        draft.document.layers.forEach((layer) => {
          layer.glyphs.forEach((glyph) => {
            if (glyph.swatchId === swatchId) {
              glyph.foreground = normalizeColor(next.foreground) ?? glyph.foreground
            }
          })
        })

        if (draft.activeSwatchId === swatchId) {
          const color = normalizeColor(next.foreground)
          if (color) {
            draft.activeColor = color
          }
        }
      }),
    addSwatch: (paletteId, swatch) =>
      set((draft) => {
        const palette = getPaletteById(draft.document, paletteId)
        if (!palette) {
          return
        }
        const color = normalizeColor(swatch.foreground)
        if (!color) {
          return
        }
        const newSwatch: PaletteSwatch = {
          id: generateId('swatch'),
          name: swatch.name || color,
          foreground: color,
          background: swatch.background,
          accent: swatch.accent,
          locked: false,
        }
        palette.swatches.push(newSwatch)
        draft.activePaletteId = paletteId
        draft.activeSwatchId = newSwatch.id
        draft.activeColor = color
      }),
    removeSwatch: (paletteId, swatchId) =>
      set((draft) => {
        const palette = getPaletteById(draft.document, paletteId)
        if (!palette) {
          return
        }
        const index = palette.swatches.findIndex((item) => item.id === swatchId)
        if (index === -1) {
          return
        }
        palette.swatches.splice(index, 1)

        draft.document.layers.forEach((layer) => {
          layer.glyphs.forEach((glyph) => {
            if (glyph.swatchId === swatchId) {
              glyph.swatchId = undefined
            }
          })
        })

        if (draft.activeSwatchId === swatchId) {
          draft.activeSwatchId = palette.swatches[0]?.id
        }

        syncActiveColor(draft)
      }),
    placeGlyph: (position, options) =>
      set((draft) => {
        const layerId = draft.activeLayerId
        if (!layerId) {
          return
        }

        const targetLayerIndex = findLayerIndex(draft.document, layerId)
        if (targetLayerIndex === -1) {
          return
        }

        const placement = { ...position }
        let shiftX = 0
        let shiftY = 0

        if (placement.x < 0) {
          shiftX = Math.floor(placement.x)
        }
        if (placement.y < 0) {
          shiftY = Math.floor(placement.y)
        }

        if (shiftX !== 0 || shiftY !== 0) {
          draft.document.layers.forEach((layer) => {
            layer.glyphs.forEach((glyph) => {
              glyph.position.x -= shiftX
              glyph.position.y -= shiftY
            })
          })

          placement.x -= shiftX
          placement.y -= shiftY

          draft.viewport.offset.x += shiftX * BASE_UNIT_PX * draft.viewport.scale
          draft.viewport.offset.y += shiftY * BASE_UNIT_PX * draft.viewport.scale

          if (shiftX !== 0) {
            draft.document.width += -shiftX
          }
          if (shiftY !== 0) {
            draft.document.height += -shiftY
          }
        }

        const paletteId = options?.paletteId ?? draft.activePaletteId ?? draft.document.palettes[0]?.id
        const palette = paletteId ? getPaletteById(draft.document, paletteId) : undefined
        const swatchId = options?.swatchId ?? draft.activeSwatchId
        const char = options?.char ?? draft.activeGlyphChar

        if (!char || !palette) {
          return
        }

        const swatch = swatchId ? palette.swatches.find((item) => item.id === swatchId) : undefined
        const color = normalizeColor(draft.activeColor) ?? normalizeColor(swatch?.foreground) ?? '#FFFFFF'

        const glyph: GlyphInstance = {
          id: generateId('glyph'),
          char,
          position: placement,
          transform: {
            translation: { x: 0, y: 0 },
            scale: { x: 1, y: 1 },
            rotation: draft.cursor.rotation,
          },
          paletteId: palette.id,
          swatchId: swatch?.id,
          groupIds: [],
          locked: false,
          foreground: color,
          background: swatch?.background,
        }

        draft.document.layers[targetLayerIndex].glyphs.push(glyph)

        const requiredWidth = Math.max(
          draft.document.width,
          Math.ceil(placement.x + 1),
        )
        const requiredHeight = Math.max(
          draft.document.height,
          Math.ceil(placement.y + 1),
        )

        draft.document.width = requiredWidth
        draft.document.height = requiredHeight

        recalcSelectionMeta(draft)
      }),
    updateGlyphPosition: (glyphId, position) =>
      set((draft) => {
        const entry = findGlyphEntry(draft.document, glyphId)
        if (!entry) {
          return
        }

        draft.document.layers[entry.layerIndex].glyphs[entry.glyphIndex].position = position
        if (draft.selection.glyphIds.includes(glyphId)) {
          recalcSelectionMeta(draft)
        }
      }),
    removeGlyph: (glyphId) =>
      set((draft) => {
        const entry = findGlyphEntry(draft.document, glyphId)
        if (!entry) {
          return
        }

        const [removed] = draft.document.layers[entry.layerIndex].glyphs.splice(entry.glyphIndex, 1)

        if (!removed) {
          return
        }

        for (const group of draft.document.groups) {
          group.glyphIds = group.glyphIds.filter((id) => id !== glyphId)
        }

        if (draft.selection.glyphIds.includes(glyphId)) {
          draft.selection.glyphIds = draft.selection.glyphIds.filter((id) => id !== glyphId)
          recalcSelectionMeta(draft)
        }
        syncActiveColor(draft)
      }),
    selectGlyphs: (glyphIds, options) =>
      set((draft) => {
        if (options?.additive) {
          const next = new Set(draft.selection.glyphIds)
          for (const glyphId of glyphIds) {
            next.add(glyphId)
          }
          draft.selection.glyphIds = Array.from(next)
        } else {
          draft.selection.glyphIds = [...glyphIds]
        }
        draft.selection.groupIds = deriveGroupIdsForGlyphs(draft.document, draft.selection.glyphIds)
        recalcSelectionMeta(draft)
        syncActiveColor(draft)
      }),
    clearSelection: () =>
      set((draft) => {
        draft.selection.glyphIds = []
        draft.selection.groupIds = []
        draft.selection.layerIds = draft.activeLayerId ? [draft.activeLayerId] : []
        draft.selection.bounds = undefined
        syncActiveColor(draft)
      }),
    setSelection: (selection) =>
      set((draft) => {
        draft.selection = { ...draft.selection, ...selection }
        if (selection.glyphIds) {
          recalcSelectionMeta(draft)
          if (!selection.groupIds) {
            draft.selection.groupIds = deriveGroupIdsForGlyphs(draft.document, draft.selection.glyphIds)
          }
        }
        syncActiveColor(draft)
      }),
    addLayer: (name) =>
      set((draft) => {
        const nextIndex = draft.document.layers.length
        const layer: CanvasLayer = {
          id: generateId('layer'),
          name: name ?? `Layer ${nextIndex + 1}`,
          glyphs: [],
          visible: true,
          locked: false,
          zIndex: nextIndex,
        }

        draft.document.layers.push(layer)
        draft.activeLayerId = layer.id
        draft.selection.layerIds = [layer.id]
      }),
    moveLayer: (layerId, direction) =>
      set((draft) => {
        const index = findLayerIndex(draft.document, layerId)
        if (index === -1) {
          return
        }

        const targetIndex = direction === 'up' ? index + 1 : index - 1
        if (targetIndex < 0 || targetIndex >= draft.document.layers.length) {
          return
        }

        const layers = draft.document.layers
        const temp = layers[index]
        layers[index] = layers[targetIndex]
        layers[targetIndex] = temp

        layers.forEach((layer, idx) => {
          layer.zIndex = idx
        })
      }),
    renameLayer: (layerId, name) =>
      set((draft) => {
        const index = findLayerIndex(draft.document, layerId)
        if (index !== -1) {
          draft.document.layers[index].name = name
        }
      }),
    toggleLayerVisibility: (layerId) =>
      set((draft) => {
        const index = findLayerIndex(draft.document, layerId)
        if (index !== -1) {
          draft.document.layers[index].visible = !draft.document.layers[index].visible
        }
      }),
    createGroupFromSelection: ({ name, addressableKey }) =>
      set((draft) => {
        if (!draft.selection.glyphIds.length) {
          return
        }

        const group: GlyphGroup = {
          id: generateId('group'),
          name,
          glyphIds: [...draft.selection.glyphIds],
          tags: [],
          addressableKey,
        }

        draft.document.groups.push(group)
        draft.selection.groupIds = [group.id]

        for (const layer of draft.document.layers) {
          for (const glyph of layer.glyphs) {
            if (group.glyphIds.includes(glyph.id) && !glyph.groupIds.includes(group.id)) {
              glyph.groupIds.push(group.id)
            }
          }
        }
      }),
    updateGroup: (groupId, updates) =>
      set((draft) => {
        const group = draft.document.groups.find((item) => item.id === groupId)
        if (group) {
          Object.assign(group, updates)
        }
      }),
    deleteGroup: (groupId) =>
      set((draft) => {
        draft.document.groups = draft.document.groups.filter((group) => group.id !== groupId)
        for (const layer of draft.document.layers) {
          for (const glyph of layer.glyphs) {
            glyph.groupIds = glyph.groupIds.filter((id) => id !== groupId)
          }
        }
        draft.selection.groupIds = draft.selection.groupIds.filter((id) => id !== groupId)
      }),
    setDocumentName: (name) =>
      set((draft) => {
        draft.document.name = name
      }),
    setDocumentDimensions: ({ width, height }) =>
      set((draft) => {
        draft.document.width = Math.max(1, Math.floor(width))
        draft.document.height = Math.max(1, Math.floor(height))
      }),
    resetDocument: (document) =>
      set((draft) => {
        if (document) {
          draft.document = document
        } else {
          draft.document = createInitialDocument()
        }

        draft.activeLayerId = draft.document.layers[0]?.id
        draft.selection = {
          glyphIds: [],
          groupIds: [],
          layerIds: draft.activeLayerId ? [draft.activeLayerId] : [],
        }
        draft.activePaletteId = draft.document.palettes[0]?.id
        draft.activeSwatchId = getDefaultSwatchId(draft.document, draft.activePaletteId)
        draft.activeGlyphChar = DEFAULT_GLYPH
        const palette = getPaletteById(draft.document, draft.activePaletteId)
        const color = normalizeColor(palette?.swatches[0]?.foreground) ?? '#FFFFFF'
        draft.activeColor = color
        draft.cursor = { ...initialState.cursor }
        draft.preferences = { ...initialState.preferences }
        draft.layout = structuredClone(initialState.layout)
        draft.viewport = structuredClone(initialState.viewport)
        syncActiveColor(draft)
      }),
  })),
)

export const getEditorState = (): EditorState => useEditorStore.getState()
