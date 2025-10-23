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
import { slugify } from '@shared/utils/slug'
import { persistCanvasLibrary } from './persistence'

const DEFAULT_GLYPH = '▒'
const MIN_VIEWPORT_SCALE = 0.25
const MAX_VIEWPORT_SCALE = 6
const CURSOR_SCALE_MIN = 0.25
const CURSOR_SCALE_MAX = 5
const CURSOR_SCALE_STEP = 0.25

const LAYOUT_PRESET_VISIBILITY: Record<LayoutPreset, Partial<Record<PanelId, boolean>>> = {
  classic: {
    layers: true,
    groups: true,
    glyphLibrary: true,
    inspector: true,
    palette: true,
    hotkeys: true,
  },
  reference: {
    layers: true,
    groups: true,
    glyphLibrary: true,
    inspector: false,
    palette: true,
    hotkeys: true,
  },
  animation: {
    layers: true,
    groups: true,
    glyphLibrary: false,
    inspector: true,
    palette: true,
    hotkeys: true,
  },
}

const normalizeAngle = (angle: number): number => {
  const normalized = angle % 360
  return normalized < 0 ? normalized + 360 : normalized
}

const clampScale = (scale: number): number =>
  Math.min(MAX_VIEWPORT_SCALE, Math.max(MIN_VIEWPORT_SCALE, scale))

const clampCursorScale = (scale: number): number =>
  Math.min(CURSOR_SCALE_MAX, Math.max(CURSOR_SCALE_MIN, scale))

const snapCursorScale = (scale: number): number =>
  Math.round(scale / CURSOR_SCALE_STEP) * CURSOR_SCALE_STEP

const normalizeCursorScale = (scale: number): number => {
  const snapped = snapCursorScale(clampCursorScale(scale))
  return Math.round(snapped * 100) / 100
}

const cloneDocument = (document: CanvasDocument): CanvasDocument => {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(document)
    } catch (error) {
      const cloneErrorName = typeof error === 'object' && error && 'name' in error ? (error as { name?: string }).name : undefined
      if (cloneErrorName === 'DataCloneError') {
        return JSON.parse(JSON.stringify(document)) as CanvasDocument
      }
      throw error
    }
  }

  return JSON.parse(JSON.stringify(document)) as CanvasDocument
}

const normalizeCanvasName = (value?: string): string => {
  const trimmed = value?.trim() ?? ''
  return trimmed.length ? trimmed : 'Untitled Canvas'
}

export type AutosaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

export interface AutosaveState {
  status: AutosaveStatus
  lastSavedAt?: string
  lastSaveSource?: 'manual' | 'autosave'
  error?: string
}

export interface CanvasLibraryEntry {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  document: CanvasDocument
}

const ensureDocumentMetadata = (
  document: CanvasDocument,
  timestamps?: { createdAt?: string; updatedAt?: string },
): { createdAt: string; updatedAt: string } => {
  const now = new Date().toISOString()
  const createdAt =
    timestamps?.createdAt ??
    (typeof document.metadata?.createdAt === 'string' && document.metadata.createdAt
      ? (document.metadata.createdAt as string)
      : now)
  const updatedAt =
    timestamps?.updatedAt ??
    (typeof document.metadata?.updatedAt === 'string' && document.metadata.updatedAt
      ? (document.metadata.updatedAt as string)
      : createdAt)

  if (!document.metadata || typeof document.metadata !== 'object') {
    document.metadata = {}
  }

  document.metadata.createdAt = createdAt
  document.metadata.updatedAt = updatedAt

  return { createdAt, updatedAt }
}

const createCanvasEntryFromDocument = (
  document: CanvasDocument,
  overrides?: Partial<Omit<CanvasLibraryEntry, 'document'>>,
): CanvasLibraryEntry => {
  const snapshot = cloneDocument(document)
  snapshot.id = document.id
  snapshot.name = normalizeCanvasName(document.name)
  const { createdAt, updatedAt } = ensureDocumentMetadata(snapshot, {
    createdAt: overrides?.createdAt,
    updatedAt: overrides?.updatedAt,
  })

  snapshot.metadata = {
    ...snapshot.metadata,
    createdAt,
    updatedAt,
  }

  return {
    id: snapshot.id,
    name: normalizeCanvasName(overrides?.name ?? snapshot.name),
    createdAt: overrides?.createdAt ?? createdAt,
    updatedAt: overrides?.updatedAt ?? updatedAt,
    document: snapshot,
  }
}

const sortCanvasEntriesByRecency = (entries: CanvasLibraryEntry[]) => {
  entries.sort((a, b) => {
    if (a.updatedAt === b.updatedAt) {
      return a.name.localeCompare(b.name)
    }
    return a.updatedAt < b.updatedAt ? 1 : -1
  })
}

const generateId = (prefix: string): string => {
  const sanitized = prefix.replace(/\s+/g, '-').toLowerCase() || 'id'
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${sanitized}-${crypto.randomUUID()}`
  }

  return `${sanitized}-${Math.random().toString(36).slice(2, 10)}`
}

const toCamelCase = (value: string): string => {
  const segments = value
    .split(/[-_\s]+/)
    .map((segment) => segment.trim())
    .filter(Boolean)

  if (!segments.length) {
    return ''
  }

  return segments
    .map((segment, index) => {
      const lower = segment.toLowerCase()
      if (index === 0) {
        return lower
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join('')
}

const deriveNextGroupName = (document: CanvasDocument, proposed?: string): string => {
  const trimmed = proposed?.trim()
  if (trimmed) {
    return trimmed
  }

  const existingNames = new Set(document.groups.map((group) => group.name))
  let index = 1
  let candidate = `Group ${index}`
  while (existingNames.has(candidate)) {
    index += 1
    candidate = `Group ${index}`
  }
  return candidate
}

const deriveGroupDefaults = (
  document: CanvasDocument,
  overrides?: { name?: string; addressableKey?: string },
): { name: string; addressableKey?: string } => {
  const name = deriveNextGroupName(document, overrides?.name)
  const usedKeys = new Set(
    document.groups
      .map((group) => group.addressableKey?.trim())
      .filter((key): key is string => Boolean(key)),
  )

  const providedKey = overrides?.addressableKey?.trim()
  if (providedKey) {
    let candidate = providedKey
    let suffix = 2
    while (usedKeys.has(candidate)) {
      candidate = `${providedKey}${suffix}`
      suffix += 1
    }
    return { name, addressableKey: candidate }
  }

  const slugBase = slugify(name, 'group')
  const camelKey = toCamelCase(slugBase)
  const baseKey = camelKey || 'group'
  let candidate = baseKey
  let suffix = 2
  while (usedKeys.has(candidate)) {
    candidate = `${baseKey}${suffix}`
    suffix += 1
  }
  return { name, addressableKey: candidate }
}

const deriveNextPaletteName = (
  document: CanvasDocument,
  proposed?: string,
  excludeId?: string,
): string => {
  const existing = new Set(
    document.palettes
      .filter((palette) => !excludeId || palette.id !== excludeId)
      .map((palette) => palette.name.trim().toLowerCase()),
  )

  const trimmed = proposed?.trim()
  if (trimmed) {
    let candidate = trimmed
    let suffix = 2
    while (existing.has(candidate.trim().toLowerCase())) {
      candidate = `${trimmed} (${suffix})`
      suffix += 1
    }
    return candidate
  }

  let index = document.palettes.length + 1
  let candidate = `Palette ${index}`
  while (existing.has(candidate.toLowerCase())) {
    index += 1
    candidate = `Palette ${index}`
  }
  return candidate
}

const createGroupWithGlyphs = (
  draft: EditorState,
  glyphIds: SelectionState['glyphIds'],
  overrides?: { name?: string; addressableKey?: string },
): string | null => {
  if (!glyphIds.length) {
    return null
  }

  const glyphIdSet = new Set(glyphIds)
  const { name, addressableKey } = deriveGroupDefaults(draft.document, overrides)
  const group: GlyphGroup = {
    id: generateId('group'),
    name,
    glyphIds: [...glyphIds],
    tags: [],
    addressableKey,
  }

  draft.document.groups.push(group)

  for (const layer of draft.document.layers) {
    for (const glyph of layer.glyphs) {
      if (glyphIdSet.has(glyph.id) && !glyph.groupIds.includes(group.id)) {
        glyph.groupIds.push(group.id)
      }
    }
  }

  return group.id
}

const resolveGlyphIdsFromSelection = (draft: EditorState): string[] => {
  if (draft.selection.glyphIds.length) {
    return [...draft.selection.glyphIds]
  }

  const derived = new Set<string>()
  draft.selection.groupIds.forEach((groupId) => {
    const group = draft.document.groups.find((entry) => entry.id === groupId)
    if (!group) {
      return
    }
    group.glyphIds.forEach((glyphId) => derived.add(glyphId))
  })

  return Array.from(derived)
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
  const createdAt = new Date().toISOString()

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
      createdAt,
      updatedAt: createdAt,
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
    layout.panels[panelId].collapsed = false
  }
}

const initialDocument = createInitialDocument()
const initialPalette = initialDocument.palettes[0]
const initialColor = normalizeColor(initialPalette?.swatches[0]?.foreground) ?? '#FFFFFF'
const initialCanvasEntry = createCanvasEntryFromDocument(initialDocument)
const initialAutosaveState: AutosaveState = {
  status: 'idle',
  lastSavedAt: initialCanvasEntry.updatedAt,
  lastSaveSource: undefined,
  error: undefined,
}
const initialState: EditorState = {
  document: initialDocument,
  cursor: {
    mode: 'select',
    snapped: false,
    gridEnabled: false,
    crosshairEnabled: true,
    rotation: 0,
    scale: 1,
  },
  selection: {
    glyphIds: [],
    groupIds: [],
    layerIds: initialDocument.layers[0] ? [initialDocument.layers[0].id] : [],
  },
  layout: {
    activePreset: 'classic',
    panels: {
      layers: { id: 'layers', visible: true, collapsed: false },
      groups: { id: 'groups', visible: true, collapsed: false },
      glyphLibrary: { id: 'glyphLibrary', visible: true, collapsed: false },
      inspector: { id: 'inspector', visible: true, collapsed: false },
      palette: { id: 'palette', visible: true, collapsed: false },
      hotkeys: { id: 'hotkeys', visible: true, collapsed: false },
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
  activeCanvasId?: string
  canvasLibrary: CanvasLibraryEntry[]
  hasUnsavedChanges: boolean
  autosaveState: AutosaveState
  setCursorMode: (mode: CursorMode) => void
  togglePanelVisibility: (panelId: PanelId) => void
  togglePanelCollapsed: (panelId: PanelId) => void
  setPanelCollapsed: (panelId: PanelId, collapsed: boolean) => void
  setLayoutPreset: (preset: LayoutPreset) => void
  loadLayoutFromPersistence: (layout: LayoutState) => void
  loadPalettesFromPersistence: (palettes: Palette[]) => void
  addPalette: (payload?: { name?: string; description?: string }) => void
  renamePalette: (paletteId: string, name: string) => void
  removePalette: (paletteId: string) => void
  setActiveLayer: (layerId: string) => void
  setActivePalette: (paletteId: string) => void
  setActiveSwatch: (swatchId?: string) => void
  setActiveGlyph: (glyphChar?: string) => void
  setPreferences: (preferences: Partial<EditorPreferences>) => void
  panViewport: (delta: Vec2) => void
  zoomViewport: (scaleFactor: number, anchor?: Vec2) => void
  setCursorRotation: (rotation: number) => void
  nudgeCursorRotation: (deltaDegrees: number) => void
  nudgeSelectionByPixels: (delta: Vec2) => void
  setCursorScale: (scale: number) => void
  nudgeCursorScale: (steps: number) => void
  toggleGrid: () => void
  toggleSnapping: () => void
  setActiveColor: (color: string) => void
  applyColorToSelection: (color: string) => void
  updateSwatch: (paletteId: string, swatchId: string, updates: Partial<Omit<PaletteSwatch, 'id'>>) => void
  addSwatch: (
    paletteId: string,
    swatch: Pick<PaletteSwatch, 'foreground'> & Partial<Pick<PaletteSwatch, 'name' | 'background' | 'accent'>>,
  ) => void
  moveSwatch: (
    paletteId: string,
    swatchId: string,
    options?: { targetSwatchId?: string; position?: 'before' | 'after' },
  ) => void
  removeSwatch: (paletteId: string, swatchId: string) => void
  placeGlyph: (position: Vec2, options?: Partial<Pick<GlyphInstance, 'char' | 'paletteId' | 'swatchId'>>) => void
  updateGlyphPosition: (glyphId: string, position: Vec2) => void
  removeGlyph: (glyphId: string) => void
  selectGlyphs: (glyphIds: SelectionState['glyphIds'], options?: { additive?: boolean; toggle?: boolean }) => void
  clearSelection: () => void
  setSelection: (selection: Partial<SelectionState>) => void
  addLayer: (name?: string) => void
  moveLayer: (layerId: string, direction: 'up' | 'down') => void
  renameLayer: (layerId: string, name: string) => void
  toggleLayerVisibility: (layerId: string) => void
  createGroupFromSelection: (payload?: { name?: string; addressableKey?: string }) => void
  toggleSelectionGrouping: (payload?: { name?: string; addressableKey?: string }) => void
  updateGroup: (groupId: string, updates: Partial<Omit<GlyphGroup, 'id' | 'glyphIds'>>) => void
  deleteGroup: (groupId: string) => void
  setDocumentName: (name: string) => void
  setDocumentDimensions: (dimensions: { width: number; height: number }) => void
  resetDocument: (document?: CanvasDocument) => void
  hydrateCanvasLibrary: (payload: { entries: CanvasLibraryEntry[]; activeCanvasId: string }) => void
  selectCanvas: (canvasId: string) => void
  createCanvas: (payload?: { name?: string; template?: CanvasDocument }) => CanvasLibraryEntry
  deleteCanvas: (canvasId: string) => void
  persistActiveCanvas: (options?: { source?: 'manual' | 'autosave' }) => CanvasLibraryEntry | null
  setHasUnsavedChanges: (dirty: boolean) => void
  setAutosaveState: (state: Partial<AutosaveState> & { status?: AutosaveStatus }) => void
}

interface LoadDocumentOptions {
  preserveLayout?: boolean
  preservePreferences?: boolean
  preserveViewport?: boolean
  preserveCursor?: boolean
}

const loadDocumentIntoEditor = (
  draft: EditorStore,
  document: CanvasDocument,
  options?: LoadDocumentOptions,
) => {
  const cloned = cloneDocument(document)
  const { preserveLayout = true, preservePreferences = true, preserveViewport = true, preserveCursor = true } =
    options ?? {}

  draft.document = cloned

  const firstLayerId = cloned.layers[0]?.id
  draft.activeLayerId = firstLayerId
  draft.selection = {
    glyphIds: [],
    groupIds: [],
    layerIds: firstLayerId ? [firstLayerId] : [],
    bounds: undefined,
  }

  draft.activePaletteId = cloned.palettes[0]?.id
  draft.activeSwatchId = getDefaultSwatchId(cloned, draft.activePaletteId)
  draft.activeGlyphChar = DEFAULT_GLYPH

  if (!preservePreferences) {
    draft.preferences = { ...initialState.preferences }
  }

  if (!preserveLayout) {
    draft.layout = structuredClone(initialState.layout)
  }

  if (!preserveViewport) {
    draft.viewport = structuredClone(initialState.viewport)
  }

  if (!preserveCursor) {
    draft.cursor = { ...initialState.cursor }
  }

  draft.cursor.gridEnabled = draft.preferences.showGrid
  draft.cursor.crosshairEnabled = draft.preferences.showCrosshair

  syncActiveColor(draft)
  recalcSelectionMeta(draft)
  if ((!draft.selection.layerIds || draft.selection.layerIds.length === 0) && firstLayerId) {
    draft.selection.layerIds = [firstLayerId]
  }
}

export const useEditorStore = create<EditorStore>()(
  immer((set, get) => {
    const defaultEntry = createCanvasEntryFromDocument(initialState.document)

    return {
      ...initialState,
      activeCanvasId: defaultEntry.id,
      canvasLibrary: [defaultEntry],
      hasUnsavedChanges: false,
      autosaveState: { ...initialAutosaveState, lastSavedAt: defaultEntry.updatedAt },
    setCursorMode: (mode) =>
      set((draft) => {
        draft.cursor.mode = mode
      }),
    togglePanelVisibility: (panelId) =>
      set((draft) => {
        const panel = draft.layout.panels[panelId]
        if (panel) {
          panel.visible = !panel.visible
          if (panel.visible && panel.collapsed) {
            panel.collapsed = false
          }
        }
      }),
    togglePanelCollapsed: (panelId) =>
      set((draft) => {
        const panel = draft.layout.panels[panelId]
        if (panel) {
          panel.collapsed = !panel.collapsed
        }
      }),
    setPanelCollapsed: (panelId, collapsed) =>
      set((draft) => {
        const panel = draft.layout.panels[panelId]
        if (panel) {
          panel.collapsed = collapsed
        }
      }),
    setAutosaveState: (payload) =>
      set((draft) => {
        draft.autosaveState = {
          ...draft.autosaveState,
          status: payload.status ?? draft.autosaveState.status,
          lastSavedAt: payload.lastSavedAt ?? draft.autosaveState.lastSavedAt,
          error: payload.error ?? (payload.status === 'error' ? draft.autosaveState.error : undefined),
          lastSaveSource: payload.lastSaveSource ?? draft.autosaveState.lastSaveSource,
        }
      }),
    hydrateCanvasLibrary: ({ entries, activeCanvasId }) =>
      set((draft) => {
        if (!entries.length) {
          return
        }
        const normalized = entries.map((entry) => createCanvasEntryFromDocument(entry.document, entry))
        sortCanvasEntriesByRecency(normalized)
        const activeId = normalized.some((item) => item.id === activeCanvasId)
          ? activeCanvasId
          : normalized[0].id
        const activeEntry = normalized.find((item) => item.id === activeId)
        if (!activeEntry) {
          return
        }

        draft.canvasLibrary = normalized
        draft.activeCanvasId = activeId
        loadDocumentIntoEditor(draft, activeEntry.document, {
          preserveLayout: true,
          preservePreferences: true,
          preserveViewport: true,
          preserveCursor: true,
        })
        draft.autosaveState = {
          status: 'idle',
          lastSavedAt: activeEntry.updatedAt,
          lastSaveSource: undefined,
          error: undefined,
        }
        draft.hasUnsavedChanges = false
      }),
    selectCanvas: (canvasId) => {
      const state = get()
      if (state.activeCanvasId === canvasId) {
        return
      }

      const entry = state.canvasLibrary.find((item) => item.id === canvasId)
      if (!entry) {
        return
      }

      set((draft) => {
        draft.activeCanvasId = entry.id
        loadDocumentIntoEditor(draft, entry.document, {
          preserveLayout: true,
          preservePreferences: true,
          preserveViewport: true,
          preserveCursor: true,
        })
        draft.autosaveState = {
          status: 'idle',
          lastSavedAt: entry.updatedAt,
          lastSaveSource: undefined,
          error: undefined,
        }
        draft.hasUnsavedChanges = false
      })
    },
    createCanvas: (payload) => {
      const template = payload?.template ?? createInitialDocument()
      if (!template.id) {
        template.id = generateId('document')
      }
      template.name = payload?.name ?? template.name ?? 'Untitled Canvas'
      ensureDocumentMetadata(template)
      const entry = createCanvasEntryFromDocument(template)

      set((draft) => {
        draft.canvasLibrary = draft.canvasLibrary.filter((item) => item.id !== entry.id)
        draft.canvasLibrary.push(entry)
        sortCanvasEntriesByRecency(draft.canvasLibrary)
        draft.activeCanvasId = entry.id
        loadDocumentIntoEditor(draft, entry.document, {
          preserveLayout: true,
          preservePreferences: true,
          preserveViewport: true,
          preserveCursor: true,
        })
        draft.autosaveState = {
          status: 'dirty',
          lastSavedAt: entry.updatedAt,
          lastSaveSource: undefined,
          error: undefined,
        }
        draft.hasUnsavedChanges = true
      })

      return entry
    },
    deleteCanvas: (canvasId) => {
      const state = get()
      if (!state.canvasLibrary.length) {
        return
      }

      const remaining = state.canvasLibrary.filter((entry) => entry.id !== canvasId)
      sortCanvasEntriesByRecency(remaining)
      if (!remaining.length) {
        const fallbackEntry = createCanvasEntryFromDocument(createInitialDocument())
        set((draft) => {
          draft.canvasLibrary = [fallbackEntry]
          draft.activeCanvasId = fallbackEntry.id
          loadDocumentIntoEditor(draft, fallbackEntry.document, {
            preserveLayout: true,
            preservePreferences: true,
            preserveViewport: true,
            preserveCursor: true,
          })
          draft.autosaveState = {
            status: 'dirty',
            lastSavedAt: fallbackEntry.updatedAt,
            lastSaveSource: undefined,
            error: undefined,
          }
          draft.hasUnsavedChanges = true
        })
        const updatedAfterDeletion = get()
        persistCanvasLibrary({
          activeCanvasId: updatedAfterDeletion.activeCanvasId,
          canvases: updatedAfterDeletion.canvasLibrary,
        })
        return
      }

      const nextActiveId =
        state.activeCanvasId && state.activeCanvasId !== canvasId
          ? state.activeCanvasId
          : remaining[0].id

      const activeEntry = remaining.find((item) => item.id === nextActiveId) ?? remaining[0]

      set((draft) => {
        draft.canvasLibrary = remaining
        draft.activeCanvasId = activeEntry.id
        loadDocumentIntoEditor(draft, activeEntry.document, {
          preserveLayout: true,
          preservePreferences: true,
          preserveViewport: true,
          preserveCursor: true,
        })
        draft.autosaveState = {
          status: 'idle',
          lastSavedAt: activeEntry.updatedAt,
          lastSaveSource: undefined,
          error: undefined,
        }
        draft.hasUnsavedChanges = false
      })
      const updatedAfterDeletion = get()
      persistCanvasLibrary({
        activeCanvasId: updatedAfterDeletion.activeCanvasId,
        canvases: updatedAfterDeletion.canvasLibrary,
      })
    },
    persistActiveCanvas: (options) => {
      const state = get()
      const activeId = state.activeCanvasId ?? state.document.id ?? generateId('document')

      set((draft) => {
        draft.document.id = activeId
        draft.document.name = normalizeCanvasName(draft.document.name)
        const { createdAt } = ensureDocumentMetadata(draft.document)
        const updatedAt = new Date().toISOString()
        ensureDocumentMetadata(draft.document, { createdAt, updatedAt })
        const entry = createCanvasEntryFromDocument(draft.document, { id: activeId, createdAt, updatedAt })

        const index = draft.canvasLibrary.findIndex((item) => item.id === entry.id)
        if (index === -1) {
          draft.canvasLibrary.push(entry)
        } else {
          draft.canvasLibrary[index] = entry
        }
        sortCanvasEntriesByRecency(draft.canvasLibrary)
        draft.activeCanvasId = entry.id
        draft.autosaveState = {
          status: 'saved',
          lastSavedAt: entry.updatedAt,
          lastSaveSource: options?.source ?? 'autosave',
          error: undefined,
        }
        draft.hasUnsavedChanges = false
      })

      const updatedState = get()
      const success = persistCanvasLibrary({
        activeCanvasId: updatedState.activeCanvasId,
        canvases: updatedState.canvasLibrary,
      })

      if (!success) {
        set((draft) => {
          draft.hasUnsavedChanges = true
          draft.autosaveState = {
            status: 'error',
            lastSavedAt: draft.autosaveState.lastSavedAt,
            lastSaveSource: options?.source ?? 'autosave',
            error: 'Failed to persist canvas changes',
          }
        })
        return null
      }

      return updatedState.canvasLibrary.find((item) => item.id === updatedState.activeCanvasId) ?? null
    },
    setHasUnsavedChanges: (dirty) =>
      set((draft) => {
        draft.hasUnsavedChanges = dirty
        if (dirty) {
          draft.autosaveState = {
            ...draft.autosaveState,
            status: 'dirty',
            error: undefined,
          }
        } else if (draft.autosaveState.status === 'dirty') {
          draft.autosaveState = {
            ...draft.autosaveState,
            status: 'idle',
          }
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
            draft.layout.panels[panelId].collapsed = persisted.collapsed ?? false
          }
        })
        draft.layout.panels.groups.visible = true
        draft.layout.panels.groups.collapsed = false
        draft.layout.panels.palette.visible = true
        draft.layout.panels.hotkeys.visible = true
        draft.layout.panels.palette.collapsed = false
        draft.layout.panels.hotkeys.collapsed = false
      }),
    loadPalettesFromPersistence: (palettes) =>
      set((draft) => {
        if (!Array.isArray(palettes) || !palettes.length) {
          return
        }

        draft.document.palettes = palettes.map((palette) => ({
          ...palette,
          swatches: palette.swatches.map((swatch) => ({ ...swatch })),
        }))

        const hasActivePalette = draft.activePaletteId
          ? draft.document.palettes.some((palette) => palette.id === draft.activePaletteId)
          : false

        if (!hasActivePalette) {
          draft.activePaletteId = draft.document.palettes[0]?.id
        }

        const activePalette = getPaletteById(draft.document, draft.activePaletteId)
        const hasActiveSwatch =
          draft.activeSwatchId &&
          activePalette?.swatches.some((swatch) => swatch.id === draft.activeSwatchId)

        if (!hasActiveSwatch) {
          draft.activeSwatchId = activePalette?.swatches[0]?.id
        }

        syncActiveColor(draft)
      }),
    addPalette: (payload) =>
      set((draft) => {
        const paletteName = deriveNextPaletteName(draft.document, payload?.name)
        const paletteId = generateId('palette')
        const baseColor = normalizeColor(draft.activeColor) ?? '#FFFFFF'
        const swatch: PaletteSwatch = {
          id: generateId('swatch'),
          name: baseColor,
          foreground: baseColor,
          background: undefined,
          accent: undefined,
          locked: false,
        }

        const palette: Palette = {
          id: paletteId,
          name: paletteName,
          swatches: [swatch],
          locked: false,
          mutable: true,
          description: payload?.description,
        }

        draft.document.palettes.push(palette)
        draft.activePaletteId = paletteId
        draft.activeSwatchId = swatch.id
        draft.activeColor = baseColor
        syncActiveColor(draft)
      }),
    renamePalette: (paletteId, name) =>
      set((draft) => {
        const palette = getPaletteById(draft.document, paletteId)
        if (!palette || palette.mutable === false) {
          return
        }
        const trimmed = name?.trim()
        if (!trimmed) {
          return
        }
        const nextName = deriveNextPaletteName(draft.document, trimmed, paletteId)
        palette.name = nextName
      }),
    removePalette: (paletteId) =>
      set((draft) => {
        const palettes = draft.document.palettes
        if (palettes.length <= 1) {
          return
        }
        const index = palettes.findIndex((palette) => palette.id === paletteId)
        if (index === -1) {
          return
        }
        const palette = palettes[index]
        if (palette.mutable === false) {
          return
        }

        palettes.splice(index, 1)
        const fallback = palettes[0]

        if (fallback) {
          draft.document.layers.forEach((layer) => {
            layer.glyphs.forEach((glyph) => {
              if (glyph.paletteId !== paletteId) {
                return
              }
              glyph.paletteId = fallback.id
              if (
                glyph.swatchId &&
                !fallback.swatches.some((swatch) => swatch.id === glyph.swatchId)
              ) {
                glyph.swatchId = fallback.swatches[0]?.id
              }
            })
          })
        }

        if (draft.activePaletteId === paletteId || !getPaletteById(draft.document, draft.activePaletteId)) {
          draft.activePaletteId = fallback?.id
          draft.activeSwatchId = getDefaultSwatchId(draft.document, draft.activePaletteId)
        }

        syncActiveColor(draft)
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
    nudgeSelectionByPixels: (delta) =>
      set((draft) => {
        if (delta.x === 0 && delta.y === 0) {
          return
        }

        const glyphIds = new Set<string>(draft.selection.glyphIds)
        if (draft.selection.groupIds.length) {
          for (const groupId of draft.selection.groupIds) {
            const group = draft.document.groups.find((item) => item.id === groupId)
            if (group) {
              group.glyphIds.forEach((id) => glyphIds.add(id))
            }
          }
        }

        if (!glyphIds.size) {
          return
        }

        const deltaUnits = {
          x: delta.x / BASE_UNIT_PX,
          y: delta.y / BASE_UNIT_PX,
        }

        if (deltaUnits.x === 0 && deltaUnits.y === 0) {
          return
        }

        let moved = false

        draft.document.layers.forEach((layer) => {
          layer.glyphs.forEach((glyph) => {
            const isSelected = glyphIds.has(glyph.id)
            const transform = glyph.transform ?? {
              translation: { x: 0, y: 0 },
              rotation: 0,
              scale: { x: 1, y: 1 },
            }
            const translation = transform.translation ?? { x: 0, y: 0 }

            if (isSelected) {
              let nextTranslationX = translation.x + deltaUnits.x
              let nextTranslationY = translation.y + deltaUnits.y

              if (nextTranslationX <= -1 || nextTranslationX >= 1) {
                const shiftX = Math.trunc(nextTranslationX)
                glyph.position.x += shiftX
                nextTranslationX -= shiftX
              }

              if (nextTranslationY <= -1 || nextTranslationY >= 1) {
                const shiftY = Math.trunc(nextTranslationY)
                glyph.position.y += shiftY
                nextTranslationY -= shiftY
              }

              transform.translation = {
                x: Number.isFinite(nextTranslationX) ? nextTranslationX : 0,
                y: Number.isFinite(nextTranslationY) ? nextTranslationY : 0,
              }

              glyph.transform = {
                translation: transform.translation,
                rotation: transform.rotation ?? glyph.transform?.rotation ?? 0,
                scale: transform.scale ?? glyph.transform?.scale ?? { x: 1, y: 1 },
              }

              moved = true
            } else {
              glyph.transform = {
                translation,
                rotation: transform.rotation ?? glyph.transform?.rotation ?? 0,
                scale: transform.scale ?? glyph.transform?.scale ?? { x: 1, y: 1 },
              }
            }
          })
        })

        if (!moved) {
          return
        }

        let requiredWidth = draft.document.width
        let requiredHeight = draft.document.height

        draft.document.layers.forEach((layer) => {
          layer.glyphs.forEach((glyph) => {
            const translation = glyph.transform?.translation ?? { x: 0, y: 0 }
            const rightExtent = glyph.position.x + 1 + Math.max(0, translation.x)
            const bottomExtent = glyph.position.y + 1 + Math.max(0, translation.y)
            requiredWidth = Math.max(requiredWidth, Math.ceil(rightExtent))
            requiredHeight = Math.max(requiredHeight, Math.ceil(bottomExtent))
          })
        })

        draft.document.width = requiredWidth
        draft.document.height = requiredHeight

        recalcSelectionMeta(draft)
      }),
    setCursorScale: (scale) =>
      set((draft) => {
        draft.cursor.scale = normalizeCursorScale(scale)
      }),
    nudgeCursorScale: (steps) =>
      set((draft) => {
        draft.cursor.scale = normalizeCursorScale(draft.cursor.scale + steps * CURSOR_SCALE_STEP)
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
    moveSwatch: (paletteId, swatchId, options) =>
      set((draft) => {
        const palette = getPaletteById(draft.document, paletteId)
        if (!palette || palette.mutable === false) {
          return
        }

        if (options?.targetSwatchId === swatchId) {
          return
        }

        const index = palette.swatches.findIndex((item) => item.id === swatchId)
        if (index === -1) {
          return
        }

        if (palette.swatches.length <= 1) {
          return
        }

        const [entry] = palette.swatches.splice(index, 1)
        if (!entry) {
          return
        }

        let targetIndex: number
        if (options?.targetSwatchId) {
          const target = palette.swatches.findIndex((item) => item.id === options.targetSwatchId)
          if (target === -1) {
            palette.swatches.splice(index, 0, entry)
            return
          }
          targetIndex = options?.position === 'after' ? target + 1 : target
        } else {
          targetIndex = options?.position === 'after' ? palette.swatches.length : 0
        }

        if (targetIndex < 0) {
          targetIndex = 0
        }
        if (targetIndex > palette.swatches.length) {
          targetIndex = palette.swatches.length
        }

        palette.swatches.splice(targetIndex, 0, entry)
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

        const cursorScale = draft.cursor.scale ?? 1

        const glyph: GlyphInstance = {
          id: generateId('glyph'),
          char,
          position: placement,
          transform: {
            translation: { x: 0, y: 0 },
            scale: { x: cursorScale, y: cursorScale },
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
        if (options?.toggle) {
          const toggled = new Set(draft.selection.glyphIds)
          for (const glyphId of glyphIds) {
            if (toggled.has(glyphId)) {
              toggled.delete(glyphId)
            } else {
              toggled.add(glyphId)
            }
          }
          draft.selection.glyphIds = Array.from(toggled)
        } else if (options?.additive) {
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
    createGroupFromSelection: (overrides) =>
      set((draft) => {
        const glyphIds = resolveGlyphIdsFromSelection(draft)
        if (!glyphIds.length) {
          return
        }

        const groupId = createGroupWithGlyphs(draft, glyphIds, overrides)
        if (!groupId) {
          return
        }

        draft.selection.glyphIds = glyphIds
        draft.selection.groupIds = [groupId]
      }),
    toggleSelectionGrouping: (overrides) =>
      set((draft) => {
        const glyphIds = resolveGlyphIdsFromSelection(draft)

        if (!glyphIds.length) {
          return
        }

        const glyphIdSet = new Set(glyphIds)
        const sharedGroups = draft.document.groups.filter((group) =>
          glyphIds.every((glyphId) => group.glyphIds.includes(glyphId)),
        )

        if (sharedGroups.length) {
          const sharedGroupIds = new Set(sharedGroups.map((group) => group.id))

          draft.document.layers.forEach((layer) => {
            layer.glyphs.forEach((glyph) => {
              if (!glyphIdSet.has(glyph.id)) {
                return
              }
              glyph.groupIds = glyph.groupIds.filter((groupId) => !sharedGroupIds.has(groupId))
            })
          })

          sharedGroups.forEach((group) => {
            group.glyphIds = group.glyphIds.filter((glyphId) => !glyphIdSet.has(glyphId))
          })

          draft.document.groups = draft.document.groups.filter((group) => group.glyphIds.length > 0)
          draft.selection.glyphIds = glyphIds
          draft.selection.groupIds = deriveGroupIdsForGlyphs(draft.document, glyphIds)
          return
        }

        const groupId = createGroupWithGlyphs(draft, glyphIds, overrides)
        if (!groupId) {
          return
        }

        draft.selection.glyphIds = glyphIds
        draft.selection.groupIds = [groupId]
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
        const canvasId = draft.activeCanvasId ?? draft.document.id
        if (!canvasId) {
          return
        }
        const entry = draft.canvasLibrary.find((item) => item.id === canvasId)
        if (entry) {
          entry.name = normalizeCanvasName(name)
        }
      }),
    setDocumentDimensions: ({ width, height }) =>
      set((draft) => {
        draft.document.width = Math.max(1, Math.floor(width))
        draft.document.height = Math.max(1, Math.floor(height))
      }),
    resetDocument: (document) =>
      set((draft) => {
        const nextDocument = document ? cloneDocument(document) : createInitialDocument()
        ensureDocumentMetadata(nextDocument)
        const entry = createCanvasEntryFromDocument(nextDocument)

        draft.canvasLibrary = [entry]
        draft.activeCanvasId = entry.id
        loadDocumentIntoEditor(draft, nextDocument, {
          preserveLayout: false,
          preservePreferences: false,
          preserveViewport: false,
          preserveCursor: false,
        })
        draft.autosaveState = {
          status: 'idle',
          lastSavedAt: entry.updatedAt,
          lastSaveSource: undefined,
          error: undefined,
        }
        draft.hasUnsavedChanges = false
      }),
  }
  }),
)

export const getEditorState = (): EditorState => useEditorStore.getState()
