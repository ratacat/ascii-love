import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

  it('nudges selected glyphs with arrow keys', () => {
    render(<HotkeyHarness />)
    const store = useEditorStore.getState()
    store.placeGlyph({ x: 0, y: 0 })
    const glyph = useEditorStore.getState().document.layers[0]?.glyphs.at(-1)
    if (!glyph) {
      throw new Error('Glyph not created')
    }

    store.selectGlyphs([glyph.id])
    fireEvent.keyDown(window, { key: 'ArrowRight', code: 'ArrowRight' })

    const moved = useEditorStore.getState().document.layers[0]?.glyphs.find((item) => item.id === glyph.id)
    expect(moved?.transform.translation.x ?? 0).toBeCloseTo(2 / 24)
  })

  it('applies shift-modified arrow keys for larger nudges', () => {
    render(<HotkeyHarness />)
    const store = useEditorStore.getState()
    store.placeGlyph({ x: 0, y: 0 })
    const glyph = useEditorStore.getState().document.layers[0]?.glyphs.at(-1)
    if (!glyph) {
      throw new Error('Glyph not created')
    }

    store.selectGlyphs([glyph.id])
    fireEvent.keyDown(window, { key: 'ArrowDown', code: 'ArrowDown', shiftKey: true })

    const moved = useEditorStore.getState().document.layers[0]?.glyphs.find((item) => item.id === glyph.id)
    expect(moved?.transform.translation.y ?? 0).toBeCloseTo(20 / 24)
  })

  it('reorders layers with Alt + Arrow shortcuts', () => {
    render(<HotkeyHarness />)
    const store = useEditorStore.getState()
    const initial = store.document.layers[0]
    if (!initial) {
      throw new Error('Expected base layer')
    }

    store.addLayer('Overlay')
    const overlay = useEditorStore.getState().document.layers.find((layer) => layer.name === 'Overlay')
    expect(overlay).toBeDefined()
    if (!overlay) {
      throw new Error('Expected overlay layer')
    }

    store.setActiveLayer(initial.id)
    fireEvent.keyDown(window, { key: 'ArrowUp', code: 'ArrowUp', altKey: true })

    let layers = useEditorStore.getState().document.layers
    expect(layers[0]?.id).toBe(overlay.id)
    expect(layers[1]?.id).toBe(initial.id)

    fireEvent.keyDown(window, { key: 'ArrowDown', code: 'ArrowDown', altKey: true })
    layers = useEditorStore.getState().document.layers
    expect(layers[0]?.id).toBe(initial.id)
    expect(layers[1]?.id).toBe(overlay.id)
  })

  it('reorders layers with Alt + Arrow even when focus is on an input', () => {
    render(<HotkeyHarness />)
    const store = useEditorStore.getState()
    const baseLayer = store.document.layers[0]
    if (!baseLayer) {
      throw new Error('Expected base layer')
    }

    store.addLayer('Overlay')
    const overlay = useEditorStore
      .getState()
      .document.layers.find((layer) => layer.id !== baseLayer.id)
    if (!overlay) {
      throw new Error('Expected overlay layer')
    }

    store.setActiveLayer(baseLayer.id)

    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    fireEvent.keyDown(input, { key: 'ArrowUp', code: 'ArrowUp', altKey: true })

    const layers = useEditorStore.getState().document.layers
    expect(layers[0]?.id).toBe(overlay.id)
    expect(layers[1]?.id).toBe(baseLayer.id)

    input.remove()
  })

  it('toggles snap-to-grid with Shift+S and persists preference', () => {
    render(<HotkeyHarness />)
    const store = useEditorStore.getState()
    expect(store.cursor.snapped).toBe(false)
    expect(store.preferences.snapToGridEnabled).toBe(false)

    fireEvent.keyDown(window, { key: 'S', code: 'KeyS', shiftKey: true })

    expect(useEditorStore.getState().cursor.snapped).toBe(true)
    expect(useEditorStore.getState().preferences.snapToGridEnabled).toBe(true)

    fireEvent.keyDown(window, { key: 'S', code: 'KeyS', shiftKey: true })

    expect(useEditorStore.getState().cursor.snapped).toBe(false)
    expect(useEditorStore.getState().preferences.snapToGridEnabled).toBe(false)
  })

  it('creates a new group for the current selection when pressing Cmd/Ctrl + G', async () => {
    render(<HotkeyHarness />)
    const store = useEditorStore.getState()
    store.placeGlyph({ x: 0, y: 0 })
    const glyph = useEditorStore.getState().document.layers[0]?.glyphs.at(-1)
    if (!glyph) {
      throw new Error('Glyph not created')
    }

    store.selectGlyphs([glyph.id])
    fireEvent.keyDown(window, { key: 'g', code: 'KeyG', metaKey: true })
    await waitFor(() => {
      expect(useEditorStore.getState().document.groups).toHaveLength(1)
    })

    fireEvent.keyDown(window, { key: 'g', code: 'KeyG', ctrlKey: true })
    await waitFor(() => {
      const groups = useEditorStore.getState().document.groups
      expect(groups).toHaveLength(2)
      const latestGroup = groups.at(-1)
      expect(useEditorStore.getState().selection.groupIds).toContain(latestGroup?.id)
    })
  })

  it('creates a group even when focus is on a text input', async () => {
    render(<HotkeyHarness />)
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    const store = useEditorStore.getState()
    store.placeGlyph({ x: 0, y: 0 })
    const glyph = useEditorStore.getState().document.layers[0]?.glyphs.at(-1)
    if (!glyph) {
      throw new Error('Glyph not created')
    }
    store.selectGlyphs([glyph.id])

    fireEvent.keyDown(input, { key: 'g', code: 'KeyG', metaKey: true })

    await waitFor(() => {
      expect(useEditorStore.getState().document.groups).toHaveLength(1)
    })

    input.remove()
  })

  it('ignores arrow nudge when focus is on group rename input', () => {
    render(<HotkeyHarness />)
    const store = useEditorStore.getState()
    store.placeGlyph({ x: 0, y: 0 })
    const glyph = useEditorStore.getState().document.layers[0]?.glyphs.at(-1)
    if (!glyph) {
      throw new Error('Glyph not created')
    }

    store.selectGlyphs([glyph.id])

    const input = document.createElement('input')
    input.className = 'group-panel__item-input'
    document.body.appendChild(input)
    input.focus()

    fireEvent.keyDown(input, { key: 'ArrowRight', code: 'ArrowRight' })

    const moved = useEditorStore.getState().document.layers[0]?.glyphs.find((item) => item.id === glyph.id)
    expect(moved?.transform.translation.x ?? 0).toBeCloseTo(0)

    input.remove()
  })
})
