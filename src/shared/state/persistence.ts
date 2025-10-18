import type { EditorPreferences, LayoutState, PanelId } from '@shared/types/editor'

const STORAGE_KEY = 'ascii-asset-studio/layout-config.toml'

const DEFAULT_PANEL_VISIBILITY: Record<PanelId, boolean> = {
  layers: true,
  glyphLibrary: true,
  inspector: true,
  palette: true,
}

const DEFAULT_PREFERENCES: EditorPreferences = {
  showGrid: false,
  showCrosshair: true,
  autoGroupSelection: true,
}

const createEmptyLayout = (): LayoutState => ({
  activePreset: 'classic',
  panels: {
    layers: { id: 'layers', visible: DEFAULT_PANEL_VISIBILITY.layers },
    glyphLibrary: { id: 'glyphLibrary', visible: DEFAULT_PANEL_VISIBILITY.glyphLibrary },
    inspector: { id: 'inspector', visible: DEFAULT_PANEL_VISIBILITY.inspector },
    palette: { id: 'palette', visible: DEFAULT_PANEL_VISIBILITY.palette },
  },
})

export interface PersistedEditorState {
  layout: LayoutState
  preferences: EditorPreferences
}

const serializeBoolean = (value: boolean): string => (value ? 'true' : 'false')

const sanitizeString = (value: string): string => value.replace(/"/g, '\\"')

export const serializeEditorStateToToml = ({ layout, preferences }: PersistedEditorState): string => {
  const lines: string[] = [
    '# ASCII Asset Studio layout + preference snapshot',
    `activePreset = "${sanitizeString(layout.activePreset)}"`,
    '',
    '[panels]',
  ]

  ;(Object.keys(layout.panels) as PanelId[]).forEach((panelId) => {
    lines.push(`${panelId} = ${serializeBoolean(layout.panels[panelId]?.visible ?? true)}`)
  })

  lines.push('', '[preferences]')
  lines.push(`showGrid = ${serializeBoolean(preferences.showGrid)}`)
  lines.push(`showCrosshair = ${serializeBoolean(preferences.showCrosshair)}`)
  lines.push(`autoGroupSelection = ${serializeBoolean(preferences.autoGroupSelection)}`)

  return `${lines.join('\n')}\n`
}

const parseBoolean = (value: string): boolean | null => {
  if (value === 'true') return true
  if (value === 'false') return false
  return null
}

const trimQuotes = (value: string): string => value.replace(/^['"]+|['"]+$/g, '')

export const parseEditorStateFromToml = (input: string): PersistedEditorState | null => {
  if (!input.trim()) {
    return null
  }

  const layout = createEmptyLayout()
  const preferences: EditorPreferences = { ...DEFAULT_PREFERENCES }

  let section: 'root' | 'panels' | 'preferences' = 'root'

  const lines = input.split(/\r?\n/)
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
          const parsed = parseBoolean(rawValue)
          if (parsed !== null) {
            layout.panels[rawKey as PanelId].visible = parsed
          }
        }
        break
      }
      case 'preferences': {
        if (rawKey in preferences) {
          const parsed = parseBoolean(rawValue)
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
    const toml = serializeEditorStateToToml(state)
    window.localStorage.setItem(STORAGE_KEY, toml)
  } catch (error) {
    console.warn('Failed to persist editor layout settings', error)
  }
}
