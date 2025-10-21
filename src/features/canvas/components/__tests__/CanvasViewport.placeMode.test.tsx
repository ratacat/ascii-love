import { render, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useEditorStore } from '@shared/state/editorStore'

import { useEditorHotkeys } from '@shared/state/useEditorHotkeys'

import { CanvasViewport } from '../CanvasViewport'

function ViewportWithHotkeys() {
  useEditorHotkeys()
  return <CanvasViewport />
}

const PADDED_RECT = {
  x: -4800,
  y: -4800,
  left: -4800,
  top: -4800,
  right: 6720,
  bottom: 5760,
  width: 11520,
  height: 10560,
  toJSON: () => ({}),
} satisfies DOMRect

describe('CanvasViewport place mode', () => {
  beforeEach(() => {
    useEditorStore.getState().resetDocument()
    useEditorStore.getState().setCursorMode('place')
  })

  it('applies cursorless class and renders preview when hovering the canvas', () => {
    const { container } = render(<ViewportWithHotkeys />)

    const stage = container.querySelector('.canvas-viewport__canvas') as HTMLDivElement | null
    expect(stage).toBeTruthy()
    if (!stage) {
      return
    }

    Object.defineProperty(stage, 'getBoundingClientRect', {
      value: () => PADDED_RECT,
    })

    fireEvent.mouseMove(stage, { clientX: 0, clientY: 0 })

    const preview = container.querySelector('.canvas-viewport__cursor-preview')
    expect(preview).not.toBeNull()

    const classes = stage.className.split(' ')
    expect(classes).toContain('canvas-viewport__canvas--cursorless')
  })

  it('updates the preview transform when rotation hotkeys are pressed', () => {
    const { container } = render(<ViewportWithHotkeys />)
    const stage = container.querySelector('.canvas-viewport__canvas') as HTMLDivElement | null
    expect(stage).toBeTruthy()
    if (!stage) {
      return
    }

    Object.defineProperty(stage, 'getBoundingClientRect', {
      value: () => PADDED_RECT,
    })

    fireEvent.mouseMove(stage, { clientX: 0, clientY: 0 })
    fireEvent.keyDown(window, { key: 'e', code: 'KeyE' })
    expect(useEditorStore.getState().cursor.rotation).toBe(45)

    const preview = container.querySelector('.canvas-viewport__cursor-preview') as HTMLDivElement | null
    expect(preview).toBeTruthy()
    if (!preview) {
      return
    }

    expect(preview.style.transform).toContain('rotate(45deg)')
  })
})
