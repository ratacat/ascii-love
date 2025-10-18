import './StatusBar.css'

import { useEditorStore } from '@shared/state/editorStore'
import type { LayoutPreset } from '@shared/types/editor'

const PRESETS: { id: LayoutPreset; label: string }[] = [
  { id: 'classic', label: 'Classic' },
  { id: 'reference', label: 'Reference' },
  { id: 'animation', label: 'Animation' },
]

export function StatusBar() {
  const cursorMode = useEditorStore((state) => state.cursor.mode)
  const selectionCount = useEditorStore((state) => state.selection.glyphIds.length)
  const activePreset = useEditorStore((state) => state.layout.activePreset)
  const setLayoutPreset = useEditorStore((state) => state.setLayoutPreset)
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

  return (
    <footer className="status-bar">
      <div className="status-bar__section">
        <span className="status-bar__label">Mode</span>
        <span className="status-bar__value">{cursorMode}</span>
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
      <div className="status-bar__section">
        <span className="status-bar__label">Layout</span>
        <div className="status-bar__presets" role="group" aria-label="Layout presets">
          {PRESETS.map((preset) => {
            const isActive = preset.id === activePreset
            return (
              <button
                key={preset.id}
                type="button"
                className={['status-bar__preset', isActive && 'status-bar__preset--active']
                  .filter(Boolean)
                  .join(' ')}
                aria-pressed={isActive}
                onClick={() => setLayoutPreset(preset.id)}
              >
                {preset.label}
              </button>
            )
          })}
        </div>
      </div>
    </footer>
  )
}
