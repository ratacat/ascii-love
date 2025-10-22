import { beforeEach, describe, expect, it } from 'vitest'

import { useEditorStore } from './editorStore'
import type { CanvasDocument } from '@shared/types/editor'

beforeEach(() => {
  useEditorStore.getState().resetDocument()
})

describe('editorStore', () => {
  it('switches cursor mode', () => {
    const store = useEditorStore.getState()
    expect(store.cursor.mode).toBe('select')

    store.setCursorMode('place')
    expect(useEditorStore.getState().cursor.mode).toBe('place')
  })

  it('toggles panel visibility', () => {
    const store = useEditorStore.getState()
    expect(store.layout.panels.layers.visible).toBe(true)

    store.togglePanelVisibility('layers')
    expect(useEditorStore.getState().layout.panels.layers.visible).toBe(false)
  })

  it('collapses and expands panels independently of visibility', () => {
    const store = useEditorStore.getState()
    expect(store.layout.panels.palette.collapsed).toBe(false)

    store.togglePanelCollapsed('palette')
    expect(useEditorStore.getState().layout.panels.palette.collapsed).toBe(true)

    store.togglePanelVisibility('palette')
    expect(useEditorStore.getState().layout.panels.palette.visible).toBe(false)

    store.togglePanelVisibility('palette')
    const nextState = useEditorStore.getState()
    expect(nextState.layout.panels.palette.visible).toBe(true)
    expect(nextState.layout.panels.palette.collapsed).toBe(false)
  })

  it('resets document state when provided a new document', () => {
    const customDocument = {
      id: 'doc-test',
      name: 'Custom Doc',
      width: 64,
      height: 32,
      layers: [
        {
          id: 'layer-1',
          name: 'Foreground',
          glyphs: [],
          visible: true,
          locked: false,
          zIndex: 0,
        },
      ],
      groups: [],
      palettes: [
        {
          id: 'palette-1',
          name: 'Copper',
          locked: false,
          mutable: true,
          swatches: [
            {
              id: 'swatch-1',
              name: 'Glow',
              foreground: '#FFD166',
              background: '#231F20',
            },
          ],
        },
      ],
      animationHints: [],
      metadata: {},
    } satisfies CanvasDocument

    useEditorStore.getState().resetDocument(customDocument)
    const nextState = useEditorStore.getState()

    expect(nextState.document).toEqual(customDocument)
    expect(nextState.activeLayerId).toBe('layer-1')
    expect(nextState.activePaletteId).toBe('palette-1')
    expect(nextState.selection.layerIds).toEqual(['layer-1'])
  })

  it('nudges cursor scale within configured bounds', () => {
    const store = useEditorStore.getState()
    expect(store.cursor.scale).toBe(1)

    store.setCursorScale(2.25)
    expect(useEditorStore.getState().cursor.scale).toBe(2.25)

    store.setCursorScale(42)
    expect(useEditorStore.getState().cursor.scale).toBe(5)

    store.nudgeCursorScale(-20)
    expect(useEditorStore.getState().cursor.scale).toBe(0.25)
  })

  it('applies cursor scale to new glyph placements', () => {
    const store = useEditorStore.getState()
    store.setCursorMode('place')
    store.setCursorScale(1.5)
    store.placeGlyph({ x: 0, y: 0 })

    const nextState = useEditorStore.getState()
    const glyph = nextState.document.layers[0]?.glyphs.at(-1)
    expect(glyph?.transform.scale).toEqual({ x: 1.5, y: 1.5 })
  })

  it('nudges selected glyphs by pixel delta', () => {
    const store = useEditorStore.getState()
    store.placeGlyph({ x: 0, y: 0 })
    const glyph = useEditorStore.getState().document.layers[0]?.glyphs.at(-1)
    expect(glyph).toBeTruthy()
    if (!glyph) {
      return
    }

    store.selectGlyphs([glyph.id])
    store.nudgeSelectionByPixels({ x: 2, y: 0 })

    const moved = useEditorStore.getState().document.layers[0]?.glyphs.find((item) => item.id === glyph.id)
    expect(moved?.transform.translation.x ?? 0).toBeCloseTo(2 / 24)
  })

  it('nudges group selections when only a group is selected', () => {
    const store = useEditorStore.getState()
    store.placeGlyph({ x: 1, y: 1 })
    const glyph = useEditorStore.getState().document.layers[0]?.glyphs.at(-1)
    if (!glyph) {
      throw new Error('Glyph not created')
    }

    store.selectGlyphs([glyph.id])
    store.createGroupFromSelection({ name: 'Test Group' })
    const groupId = useEditorStore.getState().selection.groupIds[0]
    expect(groupId).toBeDefined()

    store.clearSelection()
    store.setSelection({ groupIds: [groupId], glyphIds: [] })
    store.nudgeSelectionByPixels({ x: 0, y: 20 })

    const moved = useEditorStore.getState().document.layers[0]?.glyphs.find((item) => item.id === glyph.id)
    expect(moved?.transform.translation.y ?? 0).toBeCloseTo(20 / 24)
  })
})
