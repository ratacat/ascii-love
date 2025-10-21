import { useEffect } from 'react'

import { TOOLBAR_TOOLS } from '@shared/constants/tools'
import { useEditorStore } from './editorStore'

const INTERACTIVE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

export function useEditorHotkeys() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target) {
        if (INTERACTIVE_TAGS.has(target.tagName) || target.isContentEditable) {
          return
        }
      }

      const state = useEditorStore.getState()
      const rawKey = event.key
      const key = rawKey.toLowerCase()

      if ((event.code === 'Space' && event.shiftKey) || key === 'g') {
        event.preventDefault()
        state.toggleGrid()
        return
      }

      if (event.shiftKey && key === 's') {
        event.preventDefault()
        state.toggleSnapping()
        return
      }

      const rotationMap: Record<string, number | undefined> = {
        w: 0,
        d: 90,
        s: 180,
        a: 270,
      }

      const isRotationKey = ['w', 'a', 's', 'd', 'q', 'e'].includes(key)
      const canRotate = !event.altKey && !event.metaKey && !event.ctrlKey && isRotationKey

      if (canRotate) {
        event.preventDefault()
        if (state.cursor.mode !== 'place') {
          state.setCursorMode('place')
        }

        const absolute = rotationMap[key]
        if (typeof absolute === 'number') {
          state.setCursorRotation(absolute)
          return
        }

        if (key === 'q') {
          state.nudgeCursorRotation(-45)
          return
        }

        if (key === 'e') {
          state.nudgeCursorRotation(45)
          return
        }
      }

      const isIncreaseKey =
        rawKey === '+' || rawKey === '=' || rawKey === 'Add' || event.code === 'NumpadAdd'
      const isDecreaseKey =
        rawKey === '-' || rawKey === '_' || rawKey === 'Subtract' || event.code === 'NumpadSubtract'

      if (!event.metaKey && !event.ctrlKey && !event.altKey && (isIncreaseKey || isDecreaseKey)) {
        if (state.cursor.mode === 'place') {
          event.preventDefault()
          const step = isIncreaseKey ? 1 : -1
          state.nudgeCursorScale(step)
        }
        return
      }

      for (const tool of TOOLBAR_TOOLS) {
        const hotkey = tool.hotkey.toLowerCase()

        if (hotkey.length === 1 && key === hotkey) {
          event.preventDefault()
          state.setCursorMode(tool.id)
          return
        }

        if (hotkey === 'space' && event.code === 'Space' && !event.shiftKey) {
          event.preventDefault()
          state.setCursorMode(tool.id)
          return
        }
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        state.clearSelection()
        return
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        const glyphIds = [...state.selection.glyphIds]
        if (!glyphIds.length) {
          return
        }
        event.preventDefault()
        glyphIds.forEach((glyphId) => state.removeGlyph(glyphId))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
