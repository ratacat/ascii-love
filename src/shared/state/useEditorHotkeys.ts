import { useEffect } from 'react'

import { TOOLBAR_TOOLS } from '@shared/constants/tools'
import { useEditorStore } from './editorStore'

const INTERACTIVE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

export function useEditorHotkeys() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as EventTarget | null
      const elementTarget = target instanceof HTMLElement ? target : null
      const rawKey = event.key
      const key = rawKey.toLowerCase()
      const isGroupNameInput = Boolean(elementTarget?.matches('.group-panel__item-input'))

      let isInteractiveTarget = Boolean(
        elementTarget && (INTERACTIVE_TAGS.has(elementTarget.tagName) || elementTarget.isContentEditable),
      )

      if (isGroupNameInput) {
        const delegateToHotkeys =
          event.metaKey || event.ctrlKey || rawKey === 'Escape' || rawKey === 'Enter'

        if (delegateToHotkeys) {
          isInteractiveTarget = false
        }
      }

      const state = useEditorStore.getState()

      if (
        event.altKey &&
        !event.metaKey &&
        !event.ctrlKey &&
        (event.key === 'ArrowUp' || event.key === 'ArrowDown')
      ) {
        event.preventDefault()
        const activeLayerId = state.activeLayerId
        if (!activeLayerId) {
          return
        }
        state.moveLayer(activeLayerId, event.key === 'ArrowUp' ? 'up' : 'down')
        return
      }

      if ((event.metaKey || event.ctrlKey) && !event.altKey && key === 'g') {
        event.preventDefault()
        const hasSelection = state.selection.glyphIds.length > 0 || state.selection.groupIds.length > 0
        if (hasSelection) {
          state.createGroupFromSelection()
        }
        return
      }

      if (isInteractiveTarget) {
        return
      }

      if (!event.metaKey && !event.ctrlKey && !event.altKey && ((event.code === 'Space' && event.shiftKey) || key === 'g')) {
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

      const arrowMap: Record<string, { x: number; y: number } | undefined> = {
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
      }

      const arrowDelta = arrowMap[event.key]
      if (arrowDelta && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const hasSelection = state.selection.glyphIds.length > 0 || state.selection.groupIds.length > 0
        if (!hasSelection) {
          return
        }

        event.preventDefault()
        const magnitude = event.shiftKey ? 20 : 2
        state.nudgeSelectionByPixels({
          x: arrowDelta.x * magnitude,
          y: arrowDelta.y * magnitude,
        })
        return
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
