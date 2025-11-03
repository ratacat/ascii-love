import type {
  CanvasDocument,
  EditorPreferences,
  LayoutState,
  PanelId,
  Palette,
  PaletteSwatch,
} from '@shared/types/editor'

const STORAGE_KEY = 'ascii-asset-studio/layout-config.toml'
const STORAGE_VERSION = 2
const CANVAS_STORAGE_KEY = 'ascii-asset-studio/canvas-library.json'
const CANVAS_STORAGE_VERSION = 1

const MIN_SNAP_INTERVAL_PX = 1
const MAX_SNAP_INTERVAL_PX = 512

const DEFAULT_PANEL_VISIBILITY: Record<PanelId, boolean> = {
  layers: true,
  groups: true,
  glyphLibrary: true,
  inspector: true,
  palette: true,
  hotkeys: true,
}

const DEFAULT_PREFERENCES: EditorPreferences = {
  showGrid: false,
  showCrosshair: true,
  autoGroupSelection: true,
  snapToGridEnabled: false,
  snapToGridIntervalPx: 1,
}

const normalizeSnapIntervalPx = (value: unknown): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return DEFAULT_PREFERENCES.snapToGridIntervalPx
  }
  const rounded = Math.round(value)
  return Math.min(MAX_SNAP_INTERVAL_PX, Math.max(MIN_SNAP_INTERVAL_PX, rounded))
}

const createEmptyLayout = (): LayoutState => ({
  activePreset: 'classic',
  panels: {
    layers: { id: 'layers', visible: DEFAULT_PANEL_VISIBILITY.layers, collapsed: false },
    groups: { id: 'groups', visible: DEFAULT_PANEL_VISIBILITY.groups, collapsed: false },
    glyphLibrary: {
      id: 'glyphLibrary',
      visible: DEFAULT_PANEL_VISIBILITY.glyphLibrary,
      collapsed: false,
    },
    inspector: { id: 'inspector', visible: DEFAULT_PANEL_VISIBILITY.inspector, collapsed: false },
    palette: { id: 'palette', visible: DEFAULT_PANEL_VISIBILITY.palette, collapsed: false },
    hotkeys: { id: 'hotkeys', visible: DEFAULT_PANEL_VISIBILITY.hotkeys, collapsed: false },
  },
})

export interface PersistedEditorState {
  layout: LayoutState
  preferences: EditorPreferences
  palettes?: Palette[]
}

interface PersistedEditorStatePayload extends PersistedEditorState {
  version: number
}

export interface PersistedCanvasRecord {
  id: string
  name: string
  document: CanvasDocument
  createdAt: string
  updatedAt: string
}

export interface PersistedCanvasLibrary {
  canvases: PersistedCanvasRecord[]
  activeCanvasId?: string
}

interface PersistedCanvasLibraryPayload extends PersistedCanvasLibrary {
  version: number
}

const deepClone = <T>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }

  return JSON.parse(JSON.stringify(value)) as T
}

const normalizeCanvasName = (name: string | undefined): string => {
  const trimmed = name?.trim()
  return trimmed && trimmed.length ? trimmed : 'Untitled Canvas'
}

const sanitizeCanvasDocument = (document: CanvasDocument): CanvasDocument => {
  const cloned = deepClone(document)
  if (!cloned.metadata || typeof cloned.metadata !== 'object') {
    cloned.metadata = {}
  }
  return cloned
}

const mapToPersistableCanvasRecord = (record: PersistedCanvasRecord): PersistedCanvasRecord => {
  const safeName = normalizeCanvasName(record.name)
  const createdAt = typeof record.createdAt === 'string' && record.createdAt ? record.createdAt : new Date().toISOString()
  const updatedAt =
    typeof record.updatedAt === 'string' && record.updatedAt ? record.updatedAt : createdAt

  return {
    id: record.id,
    name: safeName,
    createdAt,
    updatedAt,
    document: sanitizeCanvasDocument({
      ...record.document,
      id: record.id || record.document.id,
      name: safeName,
      metadata: {
        ...record.document.metadata,
        createdAt: record.document.metadata?.createdAt ?? createdAt,
        updatedAt,
      },
    }),
  }
}

const coerceCanvasRecord = (value: unknown): PersistedCanvasRecord | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const payload = value as Record<string, unknown>
  const id = typeof payload.id === 'string' ? payload.id : undefined
  const name = typeof payload.name === 'string' ? payload.name : undefined
  const createdAt =
    typeof payload.createdAt === 'string' && payload.createdAt ? payload.createdAt : undefined
  const updatedAt =
    typeof payload.updatedAt === 'string' && payload.updatedAt ? payload.updatedAt : undefined
  const document = payload.document

  if (!id || !document || typeof document !== 'object') {
    return null
  }

  const parsedDocument = sanitizeCanvasDocument(document as CanvasDocument)
  parsedDocument.id = id
  parsedDocument.name = normalizeCanvasName(name ?? parsedDocument.name)

  const derivedCreatedAt =
    createdAt ??
    (typeof parsedDocument.metadata?.createdAt === 'string'
      ? (parsedDocument.metadata.createdAt as string)
      : new Date().toISOString())
  const derivedUpdatedAt =
    updatedAt ??
    (typeof parsedDocument.metadata?.updatedAt === 'string'
      ? (parsedDocument.metadata.updatedAt as string)
      : derivedCreatedAt)

  parsedDocument.metadata = {
    ...parsedDocument.metadata,
    createdAt: derivedCreatedAt,
    updatedAt: derivedUpdatedAt,
  }

  return {
    id,
    name: normalizeCanvasName(parsedDocument.name),
    createdAt: derivedCreatedAt,
    updatedAt: derivedUpdatedAt,
    document: parsedDocument,
  }
}

const coerceLayout = (value: unknown): LayoutState => {
  const base = createEmptyLayout()
  if (!value || typeof value !== 'object') {
    return base
  }

  const payload = value as Partial<LayoutState>
  if (typeof payload.activePreset === 'string') {
    base.activePreset = payload.activePreset as LayoutState['activePreset']
  }

  const panels = payload.panels as Record<string, unknown> | undefined
  if (panels && typeof panels === 'object') {
    ;(Object.keys(base.panels) as PanelId[]).forEach((panelId) => {
      const panel = panels[panelId] as Record<string, unknown> | undefined
      if (!panel) {
        return
      }
      if (typeof panel.visible === 'boolean') {
        base.panels[panelId].visible = panel.visible
      }
      if (typeof panel.collapsed === 'boolean') {
        base.panels[panelId].collapsed = panel.collapsed
      }
    })
  }

  return base
}

const coercePreferences = (value: unknown): EditorPreferences => {
  const base: EditorPreferences = { ...DEFAULT_PREFERENCES }
  if (!value || typeof value !== 'object') {
    return base
  }

  const payload = value as Partial<EditorPreferences>
  if (typeof payload.showGrid === 'boolean') {
    base.showGrid = payload.showGrid
  }
  if (typeof payload.showCrosshair === 'boolean') {
    base.showCrosshair = payload.showCrosshair
  }
  if (typeof payload.autoGroupSelection === 'boolean') {
    base.autoGroupSelection = payload.autoGroupSelection
  }
  if (typeof payload.snapToGridEnabled === 'boolean') {
    base.snapToGridEnabled = payload.snapToGridEnabled
  }
  if (payload.snapToGridIntervalPx !== undefined) {
    base.snapToGridIntervalPx = normalizeSnapIntervalPx(payload.snapToGridIntervalPx)
  }

  return base
}

const toPersistableSwatch = (swatch: PaletteSwatch): PaletteSwatch => ({
  id: swatch.id,
  name: swatch.name,
  foreground: swatch.foreground,
  background: swatch.background,
  accent: swatch.accent,
  locked: swatch.locked,
})

const preparePalettesForStorage = (palettes?: Palette[]): Palette[] | undefined => {
  if (!palettes || palettes.length === 0) {
    return undefined
  }

  return palettes.map((palette) => ({
    id: palette.id,
    name: palette.name,
    swatches: palette.swatches.map(toPersistableSwatch),
    locked: palette.locked,
    mutable: palette.mutable,
    description: palette.description,
  }))
}

const coercePalettes = (value: unknown): Palette[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined
  }

  const palettes: Palette[] = []

  for (const entry of value) {
    if (!entry || typeof entry !== 'object') {
      continue
    }

    const payload = entry as Record<string, unknown>
    const id = typeof payload.id === 'string' ? payload.id : undefined
    const name = typeof payload.name === 'string' ? payload.name : undefined
    const locked = typeof payload.locked === 'boolean' ? payload.locked : false
    const mutable = typeof payload.mutable === 'boolean' ? payload.mutable : true
    const description = typeof payload.description === 'string' ? payload.description : undefined
    const swatchInput = Array.isArray(payload.swatches) ? payload.swatches : []

    const swatches: PaletteSwatch[] = []
    for (const swatchEntry of swatchInput) {
      if (!swatchEntry || typeof swatchEntry !== 'object') {
        continue
      }
      const swatchPayload = swatchEntry as Record<string, unknown>
      const swatchId = typeof swatchPayload.id === 'string' ? swatchPayload.id : undefined
      const foreground = typeof swatchPayload.foreground === 'string' ? swatchPayload.foreground : undefined
      if (!swatchId || !foreground) {
        continue
      }
      const swatch: PaletteSwatch = {
        id: swatchId,
        name: typeof swatchPayload.name === 'string' ? swatchPayload.name : foreground,
        foreground,
        background: typeof swatchPayload.background === 'string' ? swatchPayload.background : undefined,
        accent: typeof swatchPayload.accent === 'string' ? swatchPayload.accent : undefined,
        locked: typeof swatchPayload.locked === 'boolean' ? swatchPayload.locked : undefined,
      }
      swatches.push(swatch)
    }

    if (!id || !name || swatches.length === 0) {
      continue
    }

    palettes.push({
      id,
      name,
      swatches,
      locked,
      mutable,
      description,
    })
  }

  return palettes.length ? palettes : undefined
}

const tryParseJsonPayload = (input: string): PersistedEditorState | null => {
  try {
    const raw = JSON.parse(input) as Partial<PersistedEditorStatePayload>
    if (!raw || typeof raw !== 'object') {
      return null
    }

    if (typeof raw.version !== 'number') {
      return null
    }

    const layout = coerceLayout(raw.layout)
    const preferences = coercePreferences(raw.preferences)
    const palettes = coercePalettes(raw.palettes)

    return {
      layout,
      preferences,
      palettes,
    }
  } catch (error) {
    return null
  }
}

const parseLegacyBoolean = (value: string): boolean | null => {
  if (value === 'true') return true
  if (value === 'false') return false
  return null
}

const trimQuotes = (value: string): string => value.replace(/^['"]+|['"]+$/g, '')

const parseLegacyEditorState = (input: string): PersistedEditorState | null => {
  const trimmed = input.trim()
  if (!trimmed) {
    return null
  }

  const layout = createEmptyLayout()
  const preferences: EditorPreferences = { ...DEFAULT_PREFERENCES }

  let section: 'root' | 'panels' | 'preferences' = 'root'

  const lines = trimmed.split(/\r?\n/)
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) {
      continue
    }

    if (line === '[panels]') {
      section = 'panels'
      continue
    }

    if (line === '[preferences]') {
      section = 'preferences'
      continue
    }

    const [rawKey, rawValue] = line.split('=').map((token) => token?.trim() ?? '')
    if (!rawKey || typeof rawValue !== 'string') {
      continue
    }

    switch (section) {
      case 'root': {
        if (rawKey === 'activePreset' && rawValue) {
          layout.activePreset = trimQuotes(rawValue) as LayoutState['activePreset']
        }
        break
      }
      case 'panels': {
        if ((Object.keys(layout.panels) as PanelId[]).includes(rawKey as PanelId)) {
          const parsed = rawValue ? parseLegacyBoolean(rawValue) : null
          if (parsed !== null) {
            layout.panels[rawKey as PanelId].visible = parsed
          }
        }
        break
      }
      case 'preferences': {
        if (rawKey in preferences) {
          const parsed = rawValue ? parseLegacyBoolean(rawValue) : null
          if (parsed !== null) {
            const key = rawKey as keyof EditorPreferences
            preferences[key] = parsed
          }
        }
        break
      }
      default:
        break
    }
  }

  return { layout, preferences }
}

export const serializeEditorStateToToml = ({
  layout,
  preferences,
  palettes,
}: PersistedEditorState): string => {
  const payload: PersistedEditorStatePayload = {
    version: STORAGE_VERSION,
    layout: coerceLayout(layout),
    preferences: coercePreferences(preferences),
    palettes: preparePalettesForStorage(palettes),
  }

  return JSON.stringify(payload)
}

export const parseEditorStateFromToml = (input: string): PersistedEditorState | null => {
  if (!input.trim()) {
    return null
  }

  return tryParseJsonPayload(input) ?? parseLegacyEditorState(input)
}

export const loadPersistedCanvasLibrary = (): PersistedCanvasLibrary | null => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const stored = window.localStorage.getItem(CANVAS_STORAGE_KEY)
    if (!stored) {
      return null
    }

    const raw = JSON.parse(stored) as Partial<PersistedCanvasLibraryPayload>
    if (!raw || typeof raw !== 'object') {
      return null
    }

    if (typeof raw.version !== 'number') {
      return null
    }

    const entries: PersistedCanvasRecord[] = []
    if (Array.isArray(raw.canvases)) {
      for (const entry of raw.canvases) {
        const coerced = coerceCanvasRecord(entry)
        if (coerced) {
          entries.push(coerced)
        }
      }
    }

    if (!entries.length) {
      return null
    }

    const activeCanvasId =
      typeof raw.activeCanvasId === 'string' && raw.activeCanvasId
        ? raw.activeCanvasId
        : entries[0].id

    return {
      canvases: entries,
      activeCanvasId,
    }
  } catch (error) {
    console.warn('Failed to load canvas library', error)
    return null
  }
}

export const persistCanvasLibrary = (payload: PersistedCanvasLibrary): boolean => {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    const prepared = payload.canvases.map((entry) => mapToPersistableCanvasRecord(entry))
    const normalized: PersistedCanvasLibraryPayload = {
      version: CANVAS_STORAGE_VERSION,
      activeCanvasId: payload.activeCanvasId,
      canvases: prepared,
    }

    window.localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify(normalized))
    return true
  } catch (error) {
    console.warn('Failed to persist canvas library', error)
    return false
  }
}

export const loadPersistedEditorState = (): PersistedEditorState | null => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return null
    }
    return parseEditorStateFromToml(stored)
  } catch (error) {
    console.warn('Failed to load editor layout settings', error)
    return null
  }
}

export const persistEditorState = (state: PersistedEditorState) => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const serialized = serializeEditorStateToToml(state)
    window.localStorage.setItem(STORAGE_KEY, serialized)
  } catch (error) {
    console.warn('Failed to persist editor layout settings', error)
  }
}
