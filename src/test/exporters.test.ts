import { describe, expect, it } from 'vitest'

import type {
  CanvasDocument,
  CanvasLayer,
  GlyphGroup,
  LayoutState,
  Palette,
  SelectionState,
} from '@shared/types/editor'
import { buildExportDocument } from '@shared/exporters/utils'
import { parseEditorStateFromToml, serializeEditorStateToToml } from '@shared/state/persistence'

describe('export document utilities', () => {
  const makeDocument = (): CanvasDocument => {
    const palette: Palette = {
      id: 'palette-1',
      name: 'Test',
      swatches: [
        { id: 'swatch-1', name: 'Primary', foreground: '#ffffff', background: '#000000' },
      ],
      locked: false,
      mutable: true,
    }

    const layer: CanvasLayer = {
      id: 'layer-1',
      name: 'Layer 1',
      glyphs: [
        {
          id: 'glyph-1',
          char: 'A',
          position: { x: 2, y: 3 },
          transform: {
            translation: { x: 0, y: 0 },
            scale: { x: 1, y: 1 },
            rotation: 0,
          },
          paletteId: palette.id,
          swatchId: palette.swatches[0].id,
          groupIds: ['group-1'],
          locked: false,
        },
        {
          id: 'glyph-2',
          char: 'B',
          position: { x: 5, y: 6 },
          transform: {
            translation: { x: 0, y: 0 },
            scale: { x: 1, y: 1 },
            rotation: 0,
          },
          paletteId: palette.id,
          swatchId: palette.swatches[0].id,
          groupIds: ['group-1'],
          locked: false,
        },
      ],
      visible: true,
      locked: false,
      zIndex: 0,
    }

    const group: GlyphGroup = {
      id: 'group-1',
      name: 'Test Group',
      glyphIds: ['glyph-1', 'glyph-2'],
      tags: ['test'],
      addressableKey: 'testGroup',
    }

    return {
      id: 'document-1',
      name: 'Sample Document',
      width: 10,
      height: 10,
      layers: [layer],
      groups: [group],
      palettes: [palette],
      animationHints: [],
      metadata: { schemaVersion: 1 },
    }
  }

  it('builds a cropped selection document with padding', () => {
    const document = makeDocument()
    const selection: SelectionState = {
      glyphIds: ['glyph-2'],
      groupIds: ['group-1'],
      layerIds: ['layer-1'],
    }

    const exported = buildExportDocument({ document, selection, scope: 'selection', padding: 2 })

    expect(exported.width).toBe(1 + 2 * 2)
    expect(exported.height).toBe(1 + 2 * 2)
    expect(exported.layers).toHaveLength(1)
    expect(exported.layers[0].glyphs).toHaveLength(1)
    expect(exported.layers[0].glyphs[0].position).toEqual({ x: 2, y: 2 })
    expect(exported.groups).toHaveLength(1)
    expect(exported.groups[0].glyphIds).toEqual(['glyph-2'])
  })

  it('returns a full clone when no selection provided', () => {
    const document = makeDocument()
    const selection: SelectionState = {
      glyphIds: [],
      groupIds: [],
      layerIds: [],
    }

    const exported = buildExportDocument({ document, selection, scope: 'selection', padding: 1 })
    expect(exported.layers[0].glyphs).toHaveLength(document.layers[0].glyphs.length)
    expect(exported.metadata.exportScope).toBe('selection')
  })
})

describe('layout persistence serialization', () => {
  it('roundtrips layout and preferences using TOML', () => {
    const layout = {
      activePreset: 'reference',
      panels: {
        layers: { id: 'layers', visible: false },
        glyphLibrary: { id: 'glyphLibrary', visible: true },
        inspector: { id: 'inspector', visible: false },
        palette: { id: 'palette', visible: true },
      },
    } as LayoutState

    const preferences = {
      showGrid: true,
      showCrosshair: false,
      autoGroupSelection: false,
    }

    const toml = serializeEditorStateToToml({ layout, preferences })
    const parsed = parseEditorStateFromToml(toml)
    expect(parsed?.layout.activePreset).toBe('reference')
    expect(parsed?.layout.panels.layers.visible).toBe(false)
    expect(parsed?.preferences.showGrid).toBe(true)
    expect(parsed?.preferences.autoGroupSelection).toBe(false)
  })
})
