import './StatusBar.css'

import { useEditorStore } from '@shared/state/editorStore'
export function StatusBar() {
  const cursorMode = useEditorStore((state) => state.cursor.mode)
  const cursorScale = useEditorStore((state) => state.cursor.scale)
  const selectionCount = useEditorStore((state) => state.selection.glyphIds.length)
  const activeGlyphChar = useEditorStore((state) => state.activeGlyphChar)
  const activePaletteName = useEditorStore((state) => {
    const palette = state.document.palettes.find((item) => item.id === state.activePaletteId)
    return palette?.name ?? 'Default'
  })
  const activeSwatchName = useEditorStore((state) => {
    const palette = state.document.palettes.find((item) => item.id === state.activePaletteId)
    const swatch = palette?.swatches.find((item) => item.id === state.activeSwatchId)
    return swatch?.name ?? 'Primary'
  })
  const cursorScaleLabel = `×${cursorScale.toFixed(2).replace(/\.?0+$/, '')}`

  return (
    <footer className="status-bar">
      <div className="status-bar__section">
        <span className="status-bar__label">Mode</span>
        <span className="status-bar__value">{cursorMode}</span>
      </div>
      <div className="status-bar__section">
        <span className="status-bar__label">Placement Scale</span>
        <span className="status-bar__value">{cursorScaleLabel}</span>
      </div>
      <div className="status-bar__section">
        <span className="status-bar__label">Selection</span>
        <span className="status-bar__value">{selectionCount} glyph(s)</span>
      </div>
      <div className="status-bar__section">
        <span className="status-bar__label">Glyph</span>
        <span className="status-bar__value status-bar__value--glyph">
          {activeGlyphChar ?? '—'}
        </span>
      </div>
      <div className="status-bar__section">
        <span className="status-bar__label">Palette</span>
        <span className="status-bar__value">{activePaletteName}</span>
        <span className="status-bar__value status-bar__value--muted">{activeSwatchName}</span>
      </div>
    </footer>
  )
}
