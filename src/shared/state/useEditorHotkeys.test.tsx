import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { PanelChrome } from '@shared/ui/PanelChrome'
import { useEditorStore } from './editorStore'
import { useEditorHotkeys } from './useEditorHotkeys'

function HotkeyHarness() {
  useEditorHotkeys()
  return null
}

describe('useEditorHotkeys', () => {
  beforeEach(() => {
    useEditorStore.getState().resetDocument()
  })

  afterEach(() => {
    cleanup()
  })

  it('increases cursor scale when pressing plus', () => {
    render(<HotkeyHarness />)
    const store = useEditorStore.getState()
    store.setCursorMode('place')
    expect(store.cursor.scale).toBe(1)

    fireEvent.keyDown(window, { key: '+', code: 'Equal' })

    expect(useEditorStore.getState().cursor.scale).toBe(1.25)
  })

  it('clamps cursor scale at the minimum when pressing minus repeatedly', () => {
    render(<HotkeyHarness />)
    const store = useEditorStore.getState()
    store.setCursorMode('place')
    store.setCursorScale(0.25)
    expect(useEditorStore.getState().cursor.scale).toBe(0.25)

    fireEvent.keyDown(window, { key: '-', code: 'Minus' })
    fireEvent.keyDown(window, { key: '-', code: 'Minus' })

    expect(useEditorStore.getState().cursor.scale).toBe(0.25)
  })

  it('nudges cursor rotation in place mode with Q and E', () => {
    render(<HotkeyHarness />)
    expect(useEditorStore.getState().cursor.mode).toBe('select')
    expect(useEditorStore.getState().cursor.rotation).toBe(0)

    fireEvent.keyDown(window, { key: 'q', code: 'KeyQ' })
    expect(useEditorStore.getState().cursor.mode).toBe('place')
    expect(useEditorStore.getState().cursor.rotation).toBe(315)

    fireEvent.keyDown(window, { key: 'E', code: 'KeyE' })
    expect(useEditorStore.getState().cursor.rotation).toBe(0)
  })

  it('snaps cursor rotation to cardinal directions with WASD', () => {
    render(<HotkeyHarness />)
    fireEvent.keyDown(window, { key: 'w', code: 'KeyW' })
    expect(useEditorStore.getState().cursor.rotation).toBe(0)

    fireEvent.keyDown(window, { key: 'D', code: 'KeyD' })
    expect(useEditorStore.getState().cursor.rotation).toBe(90)

    fireEvent.keyDown(window, { key: 's', code: 'KeyS' })
    expect(useEditorStore.getState().cursor.rotation).toBe(180)

    fireEvent.keyDown(window, { key: 'a', code: 'KeyA' })
    expect(useEditorStore.getState().cursor.rotation).toBe(270)
  })

  it('handles rotation hotkeys while focus is on a panel toggle button', () => {
    render(
      <>
        <HotkeyHarness />
        <PanelChrome id="palette" title="Palette Manager">
          <div />
        </PanelChrome>
      </>,
    )

    const toggleButton = screen.getByRole('button', { name: /palette manager/i })
    toggleButton.focus()

    fireEvent.keyDown(toggleButton, { key: 'w', code: 'KeyW' })
    const store = useEditorStore.getState()
    expect(store.cursor.mode).toBe('place')
    expect(store.cursor.rotation).toBe(0)
  })

  it('responds to rotation keys when focus is on a glyph button', () => {
    render(<HotkeyHarness />)
    const glyphButton = document.createElement('button')
    document.body.appendChild(glyphButton)
    glyphButton.focus()

    fireEvent.keyDown(glyphButton, { key: 'q', code: 'KeyQ' })
    expect(useEditorStore.getState().cursor.rotation).toBe(315)

    glyphButton.remove()
  })
})
