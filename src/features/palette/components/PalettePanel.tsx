import './PalettePanel.css'

import type { CSSProperties } from 'react'

import { useEditorStore } from '@shared/state/editorStore'

export function PalettePanel() {
  const palettes = useEditorStore((state) => state.document.palettes)
  const activePaletteId = useEditorStore((state) => state.activePaletteId)
  const setActivePalette = useEditorStore((state) => state.setActivePalette)

  return (
    <div className="palette-panel">
      {palettes.map((palette) => {
        const isActive = palette.id === activePaletteId

        return (
          <button
            key={palette.id}
            type="button"
            className={['palette-panel__item', isActive && 'palette-panel__item--active']
              .filter(Boolean)
              .join(' ')}
            onClick={() => setActivePalette(palette.id)}
          >
            <div className="palette-panel__header">
              <span className="palette-panel__name">{palette.name}</span>
              <span className="palette-panel__meta">
                {palette.swatches.length} swatch{palette.swatches.length === 1 ? '' : 'es'}
              </span>
            </div>
            <div className="palette-panel__swatches">
              {palette.swatches.map((swatch) => (
                <span
                  key={swatch.id}
                  className="palette-panel__swatch"
                  style={
                    {
                      '--swatch-foreground': swatch.foreground,
                      '--swatch-background': swatch.background ?? '#000000',
                    } as CSSProperties
                  }
                >
                  {swatch.name}
                </span>
              ))}
            </div>
          </button>
        )
      })}
      <p className="palette-panel__hint">
        Inline palette definitions keep exports deterministic. Remapping UI and shared libraries arrive in
        a later milestone.
      </p>
    </div>
  )
}
