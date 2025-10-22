import type {
  EditorPreferences,
  LayoutState,
  PanelId,
  Palette,
  PaletteSwatch,
} from '@shared/types/editor'

const STORAGE_KEY = 'ascii-asset-studio/layout-config.toml'
const STORAGE_VERSION = 2

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
