import type { CursorMode } from '@shared/types/editor'

export interface ToolDefinition {
  id: CursorMode
  label: string
  description: string
  hotkey: string
  icon: string
}

export const TOOLBAR_TOOLS: ToolDefinition[] = [
  {
    id: 'select',
    label: 'Select',
    description: 'Select and manipulate existing glyphs',
    hotkey: 'V',
    icon: '▣',
  },
  {
    id: 'place',
    label: 'Place',
    description: 'Place a glyph from the active library',
    hotkey: 'P',
    icon: '✎',
  },
  {
    id: 'transform',
    label: 'Transform',
    description: 'Scale, rotate and skew active selections',
    hotkey: 'T',
    icon: '⤧',
  },
  {
    id: 'pan',
    label: 'Pan',
    description: 'Pan across the current canvas view',
    hotkey: 'Space',
    icon: '☍',
  },
]
