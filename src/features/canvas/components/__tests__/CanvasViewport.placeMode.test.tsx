import { render, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useEditorStore } from '@shared/state/editorStore'

import { useEditorHotkeys } from '@shared/state/useEditorHotkeys'

import { BASE_UNIT_PX } from '@shared/constants/canvas'

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

  it('renders the cursor preview above the active layer but below higher layers', () => {
    const store = useEditorStore.getState()
    const baseLayer = store.document.layers[0]
    expect(baseLayer).toBeDefined()
    if (!baseLayer) {
      return
    }

    store.placeGlyph({ x: 0, y: 0 })
    store.addLayer('Overlay')
    const overlayLayer = useEditorStore
      .getState()
      .document.layers.find((layer) => layer.id !== baseLayer.id)
    expect(overlayLayer).toBeDefined()
    if (!overlayLayer) {
      return
    }

    store.setActiveLayer(overlayLayer.id)
    store.placeGlyph({ x: 1, y: 0 })
    store.setActiveLayer(baseLayer.id)

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

    const preview = container.querySelector('.canvas-viewport__cursor-preview') as HTMLDivElement | null
    expect(preview).toBeTruthy()
    if (!preview) {
      return
    }

    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('.canvas-viewport__glyph-node'),
    )
    const baseGlyphId = useEditorStore
      .getState()
      .document.layers
      .find((layer) => layer.id === baseLayer.id)
      ?.glyphs[0]?.id
    const overlayGlyphId = useEditorStore
      .getState()
      .document.layers
      .find((layer) => layer.id === overlayLayer.id)
      ?.glyphs[0]?.id

    const baseGlyphButton = buttons.find((button) => button.dataset.glyphId === baseGlyphId) ?? null
    const overlayGlyphButton =
      buttons.find((button) => button.dataset.glyphId === overlayGlyphId) ?? null

    expect(baseGlyphButton).toBeTruthy()
    expect(overlayGlyphButton).toBeTruthy()
    if (!baseGlyphButton || !overlayGlyphButton) {
      return
    }

    expect(Number(baseGlyphButton.style.zIndex)).toBe(1)
    expect(Number(preview.style.zIndex)).toBe(2)
    expect(Number(overlayGlyphButton.style.zIndex)).toBe(3)
  })

  it('renders the cursor preview above all layers when targeting the top layer', () => {
    const store = useEditorStore.getState()
    const baseLayer = store.document.layers[0]
    expect(baseLayer).toBeDefined()
    if (!baseLayer) {
      return
    }

    store.placeGlyph({ x: 0, y: 0 })
    store.addLayer('Overlay')
    const overlayLayer = useEditorStore
      .getState()
      .document.layers.find((layer) => layer.id !== baseLayer.id)
    expect(overlayLayer).toBeDefined()
    if (!overlayLayer) {
      return
    }

    store.placeGlyph({ x: 1, y: 0 })
    store.setActiveLayer(overlayLayer.id)

    const { container } = render(<ViewportWithHotkeys />)
    const stage = container.querySelector('.canvas-viewport__canvas') as HTMLDivElement | null
    expect(stage).toBeTruthy()
    if (!stage) {
      return
    }

    Object.defineProperty(stage, 'getBoundingClientRect', {
      value: () => PADDED_RECT,
    })

    fireEvent.mouseMove(stage, { clientX: 50, clientY: 0 })

    const preview = container.querySelector('.canvas-viewport__cursor-preview') as HTMLDivElement | null
    expect(preview).toBeTruthy()
    if (!preview) {
      return
    }

    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('.canvas-viewport__glyph-node'),
    )
    const baseGlyphId = useEditorStore
      .getState()
      .document.layers
      .find((layer) => layer.id === baseLayer.id)
      ?.glyphs[0]?.id
    const overlayGlyphId = useEditorStore
      .getState()
      .document.layers
      .find((layer) => layer.id === overlayLayer.id)
      ?.glyphs[0]?.id

    const baseGlyphButton = buttons.find((button) => button.dataset.glyphId === baseGlyphId) ?? null
    const overlayGlyphButton =
      buttons.find((button) => button.dataset.glyphId === overlayGlyphId) ?? null

    expect(baseGlyphButton).toBeTruthy()
    expect(overlayGlyphButton).toBeTruthy()
    if (!baseGlyphButton || !overlayGlyphButton) {
      return
    }

    expect(Number(baseGlyphButton.style.zIndex)).toBe(1)
    expect(Number(overlayGlyphButton.style.zIndex)).toBe(3)
    expect(Number(preview.style.zIndex)).toBe(4)
  })

  it('cycles selection to an underlying glyph on a rapid second click', () => {
    const actions = useEditorStore.getState()
    actions.resetDocument()

    const palette = useEditorStore.getState().document.palettes[0]
    expect(palette).toBeDefined()
    const paletteId = palette?.id
    const swatchId = palette?.swatches[0]?.id
    expect(paletteId).toBeTruthy()
    expect(swatchId).toBeTruthy()

    actions.placeGlyph({ x: 0, y: 0 }, { char: 'A', paletteId, swatchId })

    const baseLayer = useEditorStore.getState().document.layers[0]
    expect(baseLayer).toBeDefined()
    const baseGlyphId = baseLayer?.glyphs[0]?.id
    expect(baseGlyphId).toBeTruthy()

    actions.placeGlyph({ x: 0, y: 0 }, { char: 'B', paletteId, swatchId })
    actions.placeGlyph({ x: 0, y: 0 }, { char: 'C', paletteId, swatchId })
    const midGlyphId = useEditorStore.getState().document.layers[0]?.glyphs[1]?.id
    const topGlyphId = useEditorStore.getState().document.layers[0]?.glyphs[2]?.id
    expect(midGlyphId).toBeTruthy()
    expect(topGlyphId).toBeTruthy()

    actions.setCursorMode('select')

    const { container } = render(<ViewportWithHotkeys />)
    const stage = container.querySelector('.canvas-viewport__canvas') as HTMLDivElement | null
    expect(stage).toBeTruthy()
    if (!stage || !baseGlyphId || !topGlyphId) {
      return
    }

    Object.defineProperty(stage, 'getBoundingClientRect', {
      value: () => PADDED_RECT,
    })

    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('.canvas-viewport__glyph-node'),
    )
    expect(buttons).toHaveLength(3)

    const nowSpy = vi.spyOn(performance, 'now')
    nowSpy.mockReturnValue(0)

    const clientCoord = PADDED_RECT.left + (200 + 0.5) * BASE_UNIT_PX

    const topButton = buttons[2]

    fireEvent.click(topButton, { clientX: clientCoord, clientY: clientCoord })
    expect(useEditorStore.getState().selection.glyphIds).toEqual([topGlyphId])

    nowSpy.mockReturnValue(100)
    fireEvent.click(topButton, { clientX: clientCoord, clientY: clientCoord })
    expect(useEditorStore.getState().selection.glyphIds).toEqual([baseGlyphId])

    nowSpy.mockReturnValue(200)
    fireEvent.click(topButton, { clientX: clientCoord, clientY: clientCoord })
    expect(useEditorStore.getState().selection.glyphIds).toEqual([midGlyphId])

    nowSpy.mockReturnValue(300)
    fireEvent.click(topButton, { clientX: clientCoord, clientY: clientCoord })
    expect(useEditorStore.getState().selection.glyphIds).toEqual([topGlyphId])

    nowSpy.mockRestore()
  })
})
