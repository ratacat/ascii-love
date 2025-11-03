import { describe, expect, it } from 'vitest'

import type {
  CanvasDocument,
  CanvasLayer,
  GlyphGroup,
  LayoutState,
  Palette,
  SelectionState,
} from '@shared/types/editor'
import { BASE_UNIT_PX } from '@shared/constants/canvas'
import { svgExporter } from '@shared/exporters/svg'
import { buildExportDocument } from '@shared/exporters/utils'
import { parseEditorStateFromToml, serializeEditorStateToToml } from '@shared/state/persistence'

const makeDocument = (): CanvasDocument => {
  const palette: Palette = {
    id: 'palette-1',
    name: 'Test',
    swatches: [{ id: 'swatch-1', name: 'Primary', foreground: '#ffffff', background: '#000000' }],
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

describe('export document utilities', () => {
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
    const selectors = exported.metadata.groupSelectors as Record<string, string> | undefined
    expect(selectors).toEqual({ 'group-1': 'testgroup' })
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
    const selectors = exported.metadata.groupSelectors as Record<string, string> | undefined
    expect(selectors).toEqual({ 'group-1': 'testgroup' })
  })
})

describe('svg exporter', () => {
  it('includes glyph transforms in exported SVG output', () => {
    const document = makeDocument()
    document.layers[0].glyphs[0].transform = {
      translation: { x: 0.25, y: -0.5 },
      scale: { x: 1.5, y: 0.75 },
      rotation: 45,
    }

    const result = svgExporter.run({
      document,
      selection: { glyphIds: [], groupIds: [], layerIds: [] },
      scope: 'document',
      padding: 0,
    })

    const exportDocument = buildExportDocument({
      document,
      selection: { glyphIds: [], groupIds: [], layerIds: [] },
      scope: 'document',
      padding: 0,
    })
    const exportedGlyph = exportDocument.layers[0].glyphs[0]
    const CELL_SIZE = BASE_UNIT_PX
    const BASELINE_OFFSET = 0
    const formatNumber = (value: number, fractionDigits = 2): string => {
      const rounded = Number.parseFloat(value.toFixed(fractionDigits))
      return Object.is(rounded, -0) ? '0' : rounded.toString()
    }
    const translationX =
      (exportedGlyph.position.x + 0.5 + (exportedGlyph.transform?.translation?.x ?? 0)) * CELL_SIZE
    const translationY =
      (exportedGlyph.position.y + 0.5 + (exportedGlyph.transform?.translation?.y ?? 0)) *
        CELL_SIZE +
      BASELINE_OFFSET

    expect(result.mimeType).toBe('image/svg+xml')
    expect(result.content).toContain(
      `transform="translate(${formatNumber(translationX)} ${formatNumber(
        translationY,
      )}) rotate(${formatNumber(exportedGlyph.transform?.rotation ?? 0)}) scale(${formatNumber(
        exportedGlyph.transform?.scale?.x ?? 1,
        3,
      )} ${formatNumber(exportedGlyph.transform?.scale?.y ?? 1, 3)})"`,
    )
    expect(result.content).toContain('<text x="0" y="0"')
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
        hotkeys: { id: 'hotkeys', visible: true },
      },
    } as LayoutState

    const preferences = {
      showGrid: true,
      showCrosshair: false,
      autoGroupSelection: false,
      snapToGridEnabled: true,
      snapToGridIntervalPx: 8,
    }

    const palettes: Palette[] = [
      {
        id: 'palette-123',
        name: 'Persisted',
        swatches: [
          { id: 'swatch-1', name: 'Primary', foreground: '#abcdef', background: '#000000' },
          { id: 'swatch-2', name: 'Accent', foreground: '#123456' },
        ],
        locked: false,
        mutable: true,
      },
    ]

    const serialized = serializeEditorStateToToml({ layout, preferences, palettes })
    const parsed = parseEditorStateFromToml(serialized)
    expect(parsed?.layout.activePreset).toBe('reference')
    expect(parsed?.layout.panels.layers.visible).toBe(false)
    expect(parsed?.layout.panels.hotkeys.visible).toBe(true)
    expect(parsed?.preferences.showGrid).toBe(true)
    expect(parsed?.preferences.autoGroupSelection).toBe(false)
    expect(parsed?.preferences.snapToGridEnabled).toBe(true)
    expect(parsed?.preferences.snapToGridIntervalPx).toBe(8)
    expect(parsed?.palettes?.[0].id).toBe('palette-123')
    expect(parsed?.palettes?.[0].swatches).toHaveLength(2)
    expect(parsed?.palettes?.[0].swatches[0].foreground).toBe('#abcdef')
  })

  it('parses legacy TOML format without palette data', () => {
    const legacy = [
      '# ASCII Asset Studio layout + preference snapshot',
      'activePreset = "reference"',
      '',
      '[panels]',
      'layers = false',
      'glyphLibrary = true',
      'inspector = false',
      'palette = true',
      '',
      '[preferences]',
      'showGrid = true',
      'showCrosshair = false',
      'autoGroupSelection = false',
      '',
    ].join('\n')

    const parsed = parseEditorStateFromToml(legacy)
    expect(parsed?.layout.activePreset).toBe('reference')
    expect(parsed?.preferences.showGrid).toBe(true)
    expect(parsed?.preferences.snapToGridEnabled).toBe(false)
    expect(parsed?.preferences.snapToGridIntervalPx).toBe(1)
    expect(parsed?.palettes).toBeUndefined()
  })
})
