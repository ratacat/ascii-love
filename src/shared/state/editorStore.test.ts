import { beforeEach, describe, expect, it } from 'vitest'

import { useEditorStore } from './editorStore'
import type { CanvasDocument } from '@shared/types/editor'

beforeEach(() => {
  window.localStorage.clear()
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

    expect(nextState.document.id).toBe(customDocument.id)
    expect(nextState.document.name).toBe(customDocument.name)
    expect(nextState.document.layers[0]?.id).toBe('layer-1')
    expect(nextState.activeLayerId).toBe('layer-1')
    expect(nextState.activePaletteId).toBe('palette-1')
    expect(nextState.selection.layerIds).toEqual(['layer-1'])
    expect(nextState.canvasLibrary[0]?.id).toBe(customDocument.id)
    expect(nextState.activeCanvasId).toBe(customDocument.id)
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

  it('toggles glyph selection when toggle option is provided', () => {
    const store = useEditorStore.getState()
    store.placeGlyph({ x: 0, y: 0 })
    store.placeGlyph({ x: 1, y: 0 })

    const glyphs = useEditorStore.getState().document.layers[0]?.glyphs.slice(-2)
    expect(glyphs?.length).toBe(2)
    if (!glyphs) {
      throw new Error('Glyphs not created')
    }

    store.selectGlyphs([glyphs[0].id])
    store.selectGlyphs([glyphs[1].id], { toggle: true })

    expect(useEditorStore.getState().selection.glyphIds).toEqual([glyphs[0].id, glyphs[1].id])

    store.selectGlyphs([glyphs[0].id], { toggle: true })
    expect(useEditorStore.getState().selection.glyphIds).toEqual([glyphs[1].id])
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

  it('toggles grouping for the current selection and assigns defaults', () => {
    const store = useEditorStore.getState()
    store.placeGlyph({ x: 2, y: 2 })
    const glyph = useEditorStore.getState().document.layers[0]?.glyphs.at(-1)
    if (!glyph) {
      throw new Error('Glyph not created')
    }

    store.selectGlyphs([glyph.id])
    store.toggleSelectionGrouping()

    const stateAfterGroup = useEditorStore.getState()
    expect(stateAfterGroup.document.groups).toHaveLength(1)
    const group = stateAfterGroup.document.groups[0]
    expect(group.glyphIds).toEqual([glyph.id])
    expect(group.name).toBe('Group 1')
    expect(group.addressableKey).toBe('group1')
    expect(stateAfterGroup.selection.groupIds).toContain(group.id)

    store.toggleSelectionGrouping()
    const stateAfterUngroup = useEditorStore.getState()
    expect(stateAfterUngroup.document.groups).toHaveLength(0)
    const glyphAfterUngroup = stateAfterUngroup.document.layers[0]?.glyphs.find((item) => item.id === glyph.id)
    expect(glyphAfterUngroup?.groupIds).toEqual([])
    expect(stateAfterUngroup.selection.groupIds).toHaveLength(0)
  })

  it('generates unique addressable keys when toggling with overrides', () => {
    const store = useEditorStore.getState()
    store.placeGlyph({ x: 0, y: 0 })
    const firstGlyph = useEditorStore.getState().document.layers[0]?.glyphs.at(-1)
    if (!firstGlyph) {
      throw new Error('First glyph not created')
    }

    store.selectGlyphs([firstGlyph.id])
    store.toggleSelectionGrouping({ name: 'Scene Highlight', addressableKey: 'hero' })

    store.placeGlyph({ x: 4, y: 4 })
    const secondGlyph = useEditorStore.getState().document.layers[0]?.glyphs.at(-1)
    if (!secondGlyph) {
      throw new Error('Second glyph not created')
    }

    store.selectGlyphs([secondGlyph.id])
    store.toggleSelectionGrouping({ name: 'Scene Highlight', addressableKey: 'hero' })

    const groups = useEditorStore.getState().document.groups
    expect(groups).toHaveLength(2)
    const keys = groups.map((group) => group.addressableKey)
    expect(keys).toEqual(['hero', 'hero2'])
  })

  it('creates a group from an existing group selection', () => {
    const store = useEditorStore.getState()
    store.placeGlyph({ x: 0, y: 0 })
    const glyph = useEditorStore.getState().document.layers[0]?.glyphs.at(-1)
    if (!glyph) {
      throw new Error('Glyph not created')
    }

    store.selectGlyphs([glyph.id])
    store.createGroupFromSelection({ name: 'Primary Group' })

    const firstGroup = useEditorStore.getState().document.groups[0]
    expect(firstGroup).toBeDefined()
    if (!firstGroup) {
      throw new Error('First group missing')
    }

    store.clearSelection()
    store.setSelection({ groupIds: [firstGroup.id], glyphIds: [] })
    store.createGroupFromSelection({ name: 'Variant Group' })

    const groups = useEditorStore.getState().document.groups
    expect(groups).toHaveLength(2)

    const variant = groups.find((group) => group.name === 'Variant Group')
    expect(variant).toBeDefined()
    expect(variant?.glyphIds).toEqual(firstGroup.glyphIds)
    const activeSelection = useEditorStore.getState().selection
    expect(activeSelection.groupIds).toContain(variant?.id)
    expect(activeSelection.glyphIds).toEqual(firstGroup.glyphIds)
  })

  it('updates canvas library metadata when persisting changes', () => {
    const store = useEditorStore.getState()
    store.setDocumentName('Renamed Canvas')
    const savedEntry = store.persistActiveCanvas({ source: 'manual' })

    expect(savedEntry?.name).toBe('Renamed Canvas')
    const nextState = useEditorStore.getState()
    expect(nextState.canvasLibrary[0]?.name).toBe('Renamed Canvas')
    expect(nextState.hasUnsavedChanges).toBe(false)
  })

  it('creates and switches between canvas documents', () => {
    const store = useEditorStore.getState()
    store.setDocumentName('Primary Canvas')
    store.persistActiveCanvas({ source: 'manual' })

    const secondary = store.createCanvas({ name: 'Secondary Canvas' })
    let stateAfterCreate = useEditorStore.getState()
    expect(stateAfterCreate.activeCanvasId).toBe(secondary.id)
    expect(stateAfterCreate.document.id).toBe(secondary.id)

    const firstEntry = useEditorStore
      .getState()
      .canvasLibrary.find((entry) => entry.name === 'Primary Canvas')
    expect(firstEntry).toBeDefined()
    if (!firstEntry) {
      throw new Error('Primary canvas missing')
    }

    store.selectCanvas(firstEntry.id)
    const afterSelect = useEditorStore.getState()
    expect(afterSelect.activeCanvasId).toBe(firstEntry.id)
    expect(afterSelect.document.id).toBe(firstEntry.id)
    expect(afterSelect.hasUnsavedChanges).toBe(false)
  })

  it('deletes canvases and falls back to a new blank canvas when needed', () => {
    const store = useEditorStore.getState()
    const initialId = store.activeCanvasId
    expect(initialId).toBeDefined()
    if (!initialId) {
      throw new Error('Initial canvas missing')
    }

    store.deleteCanvas(initialId)
    const nextState = useEditorStore.getState()
    expect(nextState.canvasLibrary).toHaveLength(1)
    expect(nextState.activeCanvasId).not.toBe(initialId)
    expect(nextState.hasUnsavedChanges).toBe(true)
  })
})
