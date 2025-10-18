import './PalettePanel.css'

import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'

import { useEditorStore } from '@shared/state/editorStore'

const ensureHex = (value: string, fallback: string): string => {
  if (!value) {
    return fallback
  }
  if (value.startsWith('#') && (value.length === 4 || value.length === 7)) {
    return value
  }
  const normalized = value.replace(/[^0-9a-fA-F]/g, '')
  if (normalized.length === 6) {
    return `#${normalized}`
  }
  return fallback
}

export function PalettePanel() {
  const palettes = useEditorStore((state) => state.document.palettes)
  const activePaletteId = useEditorStore((state) => state.activePaletteId)
  const activeSwatchId = useEditorStore((state) => state.activeSwatchId)
  const setActivePalette = useEditorStore((state) => state.setActivePalette)
  const setActiveSwatch = useEditorStore((state) => state.setActiveSwatch)
  const updateSwatch = useEditorStore((state) => state.updateSwatch)
  const addSwatch = useEditorStore((state) => state.addSwatch)

  const activePalette = useMemo(
    () => palettes.find((palette) => palette.id === activePaletteId),
    [palettes, activePaletteId],
  )

  const activeSwatch = useMemo(
    () => activePalette?.swatches.find((swatch) => swatch.id === activeSwatchId),
    [activePalette, activeSwatchId],
  )

  const [activeNameDraft, setActiveNameDraft] = useState(activeSwatch?.name ?? '')
  const [newSwatchName, setNewSwatchName] = useState('')
  const [foregroundDraft, setForegroundDraft] = useState('#ffffff')

  useEffect(() => {
    setActiveNameDraft(activeSwatch?.name ?? '')
    setForegroundDraft(ensureHex(activeSwatch?.foreground ?? '#ffffff', '#ffffff'))
  }, [activeSwatch?.id, activeSwatch?.name, activeSwatch?.foreground])

  const handleForegroundChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = ensureHex(event.target.value, foregroundDraft)
    setForegroundDraft(value)
    if (activePalette && activeSwatch) {
      updateSwatch(activePalette.id, activeSwatch.id, { foreground: value })
    }
  }

  const handleActiveNameBlur = () => {
    if (!activePalette || !activeSwatch) {
      return
    }
    const trimmed = activeNameDraft.trim()
    if (!trimmed || trimmed === activeSwatch.name) {
      setActiveNameDraft(activeSwatch.name)
      return
    }
    updateSwatch(activePalette.id, activeSwatch.id, { name: trimmed })
  }

  const handleCreateSwatch = () => {
    if (!activePalette) {
      return
    }
    const name = newSwatchName.trim() || `Swatch ${activePalette.swatches.length + 1}`
    addSwatch(activePalette.id, {
      name,
      foreground: foregroundDraft,
    })
    setNewSwatchName('')
  }

  return (
    <div className="palette-panel">
      <section className="palette-panel__controls">
        <header className="palette-panel__controls-header">
          <span className="palette-panel__controls-title">Active Colors</span>
          {activePalette ? <span className="palette-panel__controls-subtitle">{activePalette.name}</span> : null}
        </header>
        {activePalette && activeSwatch ? (
          <>
            <div className="palette-panel__field-grid">
              <label className="palette-panel__field">
                <span className="palette-panel__field-label">Swatch Name</span>
                <input
                  className="palette-panel__text-input"
                  type="text"
                  value={activeNameDraft}
                  onChange={(event) => setActiveNameDraft(event.target.value)}
                  onBlur={handleActiveNameBlur}
                />
              </label>
              <label className="palette-panel__field">
                <span className="palette-panel__field-label">Foreground</span>
                <div className="palette-panel__color-input">
                  <input type="color" value={foregroundDraft} onChange={handleForegroundChange} />
                  <span className="palette-panel__color-value">{foregroundDraft.toUpperCase()}</span>
                </div>
              </label>
            </div>
            <div className="palette-panel__actions">
              <label className="palette-panel__field palette-panel__field--inline">
                <span className="palette-panel__field-label">New swatch name</span>
                <input
                  className="palette-panel__text-input"
                  type="text"
                  placeholder="Optional"
                  value={newSwatchName}
                  onChange={(event) => setNewSwatchName(event.target.value)}
                />
              </label>
              <button type="button" className="palette-panel__primary-button" onClick={handleCreateSwatch}>
                Save as new swatch
              </button>
            </div>
          </>
        ) : (
          <p className="palette-panel__empty">Select a palette swatch to edit its colors and save variations.</p>
        )}
      </section>

      <div className="palette-panel__palettes">
        {palettes.map((palette) => {
          const isActive = palette.id === activePaletteId

          return (
            <div
              key={palette.id}
              role="button"
              tabIndex={0}
              className={['palette-panel__item', isActive && 'palette-panel__item--active']
                .filter(Boolean)
                .join(' ')}
              onClick={() => setActivePalette(palette.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setActivePalette(palette.id)
                }
              }}
            >
              <div className="palette-panel__header">
                <span className="palette-panel__name">{palette.name}</span>
                <span className="palette-panel__meta">
                  {palette.swatches.length} swatch{palette.swatches.length === 1 ? '' : 'es'}
                </span>
              </div>
              <div className="palette-panel__swatches">
                {palette.swatches.map((swatch) => (
                  <button
                    key={swatch.id}
                    type="button"
                    className="palette-panel__swatch"
                    data-active={swatch.id === activeSwatchId || undefined}
                    aria-label={`Select swatch ${swatch.name}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      setActivePalette(palette.id)
                      setActiveSwatch(swatch.id)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setActivePalette(palette.id)
                        setActiveSwatch(swatch.id)
                      }
                    }}
                    style={{ backgroundColor: swatch.foreground }}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <p className="palette-panel__hint">
        Palette edits update the live glyph preview. Save variations as swatches to reuse them quickly.
      </p>
    </div>
  )
}
