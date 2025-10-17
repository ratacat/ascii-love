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
})
