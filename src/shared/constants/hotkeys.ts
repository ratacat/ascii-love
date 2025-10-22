import { TOOLBAR_TOOLS } from './tools'

// Keep this list in sync with useEditorHotkeys and other shortcut handlers.

export interface HotkeyEntry {
  keys: string[]
  description: string
}

export interface HotkeySection {
  title: string
  entries: HotkeyEntry[]
}

const formatToolHotkey = (hotkey: string): string => {
  if (hotkey.toLowerCase() === 'space') {
    return 'Space (hold)'
  }
  return hotkey.toUpperCase()
}

export const HOTKEY_SECTIONS: HotkeySection[] = [
  {
    title: 'Cursor Modes',
    entries: TOOLBAR_TOOLS.map((tool) => ({
      keys: [formatToolHotkey(tool.hotkey)],
      description: `Switch to ${tool.label}`,
    })),
  },
  {
    title: 'Placement Controls',
    entries: [
      {
        keys: ['+', '='],
        description: 'Increase glyph size',
      },
      {
        keys: ['-', '_'],
        description: 'Decrease glyph size',
      },
      {
        keys: ['W', 'A', 'S', 'D'],
        description: 'Snap placement rotation to cardinal directions',
      },
      {
        keys: ['Q', 'E'],
        description: 'Rotate placement preview by 45° increments',
      },
      {
        keys: ['Arrow Keys'],
        description: 'Nudge selection by 2px',
      },
      {
        keys: ['Shift + Arrow Keys'],
        description: 'Nudge selection by 20px',
      },
    ],
  },
  {
    title: 'View & Snapping',
    entries: [
      {
        keys: ['G', 'Shift + Space'],
        description: 'Toggle grid overlay',
      },
      {
        keys: ['Shift + S'],
        description: 'Toggle cursor snapping',
      },
    ],
  },
  {
    title: 'Editing',
    entries: [
      {
        keys: ['Escape'],
        description: 'Clear current selection',
      },
      {
        keys: ['Delete', 'Backspace'],
        description: 'Remove selected glyphs',
      },
      {
        keys: ['Ctrl/Cmd + G'],
        description: 'Toggle grouping for current selection',
      },
    ],
  },
]
