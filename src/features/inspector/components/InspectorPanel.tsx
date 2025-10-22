import './InspectorPanel.css'

import { useCallback, useMemo } from 'react'

import { useEditorStore } from '@shared/state/editorStore'

interface GlyphDetail {
  id: string
  char: string
  layerName: string
  paletteName?: string
  swatchName?: string
  foreground: string
  background?: string
}

export function InspectorPanel() {
  const document = useEditorStore((state) => state.document)
  const selection = useEditorStore((state) => state.selection)

  const selectionSummary = selection.glyphIds.length
    ? `${selection.glyphIds.length} glyph${selection.glyphIds.length === 1 ? '' : 's'}`
    : 'No glyphs selected'

  const formatCoord = useCallback((value: number): string => {
    const clamped = Number.isFinite(value) ? value : 0
    const rounded = Number(clamped.toFixed(2))
    return rounded.toString()
  }, [])

  const selectionBounds = selection.bounds
    ? `${formatCoord(selection.bounds.min.x)},${formatCoord(selection.bounds.min.y)} → ${formatCoord(selection.bounds.max.x)},${formatCoord(selection.bounds.max.y)}`
    : '—'

  const selectedGroups = useMemo(
    () => document.groups.filter((group) => selection.groupIds.includes(group.id)),
    [document.groups, selection.groupIds],
  )

  const glyphDetails = useMemo(() => {
    if (!selection.glyphIds.length) {
      return [] as GlyphDetail[]
    }

    const glyphIdSet = new Set(selection.glyphIds)
    const paletteMap = new Map(document.palettes.map((palette) => [palette.id, palette]))
    const details: GlyphDetail[] = []

    document.layers.forEach((layer) => {
      layer.glyphs.forEach((glyph) => {
        if (!glyphIdSet.has(glyph.id)) {
          return
        }

        const palette = paletteMap.get(glyph.paletteId)
        const swatch = palette?.swatches.find((entry) => entry.id === glyph.swatchId)
        const foreground = (glyph.foreground ?? swatch?.foreground ?? '#FFFFFF').toUpperCase()
        const background = glyph.background ?? swatch?.background

        details.push({
          id: glyph.id,
          char: glyph.char,
          layerName: layer.name,
          paletteName: palette?.name,
          swatchName: swatch?.name,
          foreground,
          background: background ? background.toUpperCase() : undefined,
        })
      })
    })

    return details
  }, [document.layers, document.palettes, selection.glyphIds])

  const primaryGlyph = glyphDetails[0]
  const { uniqueCharCount, charPreview, uniqueForegrounds } = useMemo(() => {
    const charSet = new Set<string>()
    const foregroundSet = new Set<string>()

    glyphDetails.forEach((detail) => {
      charSet.add(detail.char)
      foregroundSet.add(detail.foreground)
    })

    return {
      uniqueCharCount: charSet.size,
      charPreview: charSet.size <= 3 ? Array.from(charSet) : [],
      uniqueForegrounds: Array.from(foregroundSet),
    }
  }, [glyphDetails])
  const layersLabel = selection.layerIds
    .map((layerId) => document.layers.find((layer) => layer.id === layerId)?.name ?? 'Unknown')
    .join(', ')

  return (
    <div className="inspector-panel">
      <section>
        <header className="inspector-panel__section-title">Selection</header>
        <p className="inspector-panel__metric">{selectionSummary}</p>
        {selection.layerIds.length ? (
          <p className="inspector-panel__meta">Layers: {layersLabel}</p>
        ) : null}
        <p className="inspector-panel__meta">Bounds: {selectionBounds}</p>
        {glyphDetails.length ? (
          <>
            <p className="inspector-panel__meta">
              Unique characters: {uniqueCharCount}
              {charPreview.length ? ` (${charPreview.join(', ')})` : ''}
            </p>
            <p className="inspector-panel__meta">
              Foreground variants: {uniqueForegrounds.length}
            </p>
          </>
        ) : null}
      </section>

      <section>
        <header className="inspector-panel__section-title">Glyph Details</header>
        {primaryGlyph ? (
          <div className="inspector-panel__glyph">
            <div
              className="inspector-panel__glyph-preview"
              style={{
                color: primaryGlyph.foreground,
                backgroundColor: primaryGlyph.background ?? 'transparent',
              }}
              aria-hidden
            >
              {primaryGlyph.char}
            </div>
            <div className="inspector-panel__glyph-meta">
              <p className="inspector-panel__meta">
                Palette: {primaryGlyph.paletteName ?? '—'}
                {primaryGlyph.swatchName ? ` • ${primaryGlyph.swatchName}` : ''}
              </p>
              <p className="inspector-panel__meta inspector-panel__meta--color">
                Foreground{' '}
                <span
                  className="inspector-panel__color-chip"
                  style={{ backgroundColor: primaryGlyph.foreground }}
                  aria-hidden
                />
                <code>{primaryGlyph.foreground}</code>
              </p>
              {primaryGlyph.background ? (
                <p className="inspector-panel__meta inspector-panel__meta--color">
                  Background{' '}
                  <span
                    className="inspector-panel__color-chip inspector-panel__color-chip--muted"
                    style={{ backgroundColor: primaryGlyph.background }}
                    aria-hidden
                  />
                  <code>{primaryGlyph.background}</code>
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="inspector-panel__empty">Select a glyph to view palette and color metadata.</p>
        )}
      </section>

      <section>
        <header className="inspector-panel__section-title">Groups</header>
        {selectedGroups.length ? (
          <ul className="inspector-panel__group-summary">
            {selectedGroups.map((group) => (
              <li key={group.id}>
                <div className="inspector-panel__group-name-row">
                  <strong>{group.name}</strong>
                  <span className="inspector-panel__pill">{group.glyphIds.length} glyphs</span>
                </div>
                <p className="inspector-panel__meta inspector-panel__meta--small">
                  Addressable key:{' '}
                  {group.addressableKey ? <code>{group.addressableKey}</code> : <span>—</span>}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="inspector-panel__empty">Assign groups from the Groups panel to organize selections.</p>
        )}
      </section>
    </div>
  )
}
