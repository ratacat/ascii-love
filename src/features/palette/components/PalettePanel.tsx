import './PalettePanel.css'

import { useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'

import { useEditorStore } from '@shared/state/editorStore'

const formatHex = (value: string): string => value.toUpperCase()

export function PalettePanel() {
  const palettes = useEditorStore((state) => state.document.palettes)
  const activePaletteId = useEditorStore((state) => state.activePaletteId)
  const activeSwatchId = useEditorStore((state) => state.activeSwatchId)
  const activeColor = useEditorStore((state) => state.activeColor)
  const selectionCount = useEditorStore((state) => state.selection.glyphIds.length)

  const setActivePalette = useEditorStore((state) => state.setActivePalette)
  const setActiveSwatch = useEditorStore((state) => state.setActiveSwatch)
  const setActiveColor = useEditorStore((state) => state.setActiveColor)
  const applyColorToSelection = useEditorStore((state) => state.applyColorToSelection)
  const updateSwatch = useEditorStore((state) => state.updateSwatch)
  const addSwatch = useEditorStore((state) => state.addSwatch)
  const removeSwatch = useEditorStore((state) => state.removeSwatch)

  const resolvedPaletteId = activePaletteId ?? palettes[0]?.id
  const activePalette = useMemo(
    () => palettes.find((palette) => palette.id === resolvedPaletteId),
    [palettes, resolvedPaletteId],
  )

  const activeColorInputRef = useRef<HTMLInputElement>(null)
  const newSwatchInputRef = useRef<HTMLInputElement>(null)
  const [pendingPaletteId, setPendingPaletteId] = useState<string | null>(null)

  const handleActiveColorChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setActiveColor(value)

    if (selectionCount > 0) {
      applyColorToSelection(value)
    }

    if (activePalette && activeSwatchId && activePalette.mutable !== false) {
      updateSwatch(activePalette.id, activeSwatchId, { foreground: value })
    }
  }

  const handleSwatchClick = (paletteId: string, swatchId: string, color: string) => {
    setActivePalette(paletteId)
    setActiveSwatch(swatchId)
    setActiveColor(color)

    if (selectionCount > 0) {
      applyColorToSelection(color)
    }
  }

  const handleSwatchContextMenu = (
    event: React.MouseEvent,
    paletteId: string,
    swatchId: string,
    isMutable: boolean,
  ) => {
    event.preventDefault()
    event.stopPropagation()
    if (!isMutable) {
      return
    }
    const palette = palettes.find((item) => item.id === paletteId)
    if (!palette || palette.swatches.length <= 1) {
      return
    }
    removeSwatch(paletteId, swatchId)
  }

  const requestNewSwatch = (paletteId: string) => {
    setPendingPaletteId(paletteId)
    newSwatchInputRef.current?.click()
  }

  const handleCreateSwatch = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    event.target.value = ''
    if (!pendingPaletteId || !value) {
      setPendingPaletteId(null)
      return
    }
    addSwatch(pendingPaletteId, { foreground: value })
    setActivePalette(pendingPaletteId)
    setPendingPaletteId(null)
  }

  return (
    <div className="palette-panel">
      <section className="palette-panel__active">
        <div className="palette-panel__active-header">
          <span className="palette-panel__active-label">Active Color</span>
          {selectionCount > 0 ? (
            <span className="palette-panel__active-meta">{selectionCount} selected</span>
          ) : null}
        </div>
        <div className="palette-panel__active-body">
          <button
            type="button"
            className="palette-panel__chip"
            style={{ backgroundColor: activeColor }}
            aria-label="Choose active color"
            onClick={() => activeColorInputRef.current?.click()}
          />
          <span className="palette-panel__chip-code">{formatHex(activeColor)}</span>
        </div>
        <input
          ref={activeColorInputRef}
          className="palette-panel__hidden-input"
          type="color"
          value={activeColor}
          onChange={handleActiveColorChange}
        />
      </section>

      <div className="palette-panel__palettes">
        {palettes.map((palette) => {
          const isActive = palette.id === resolvedPaletteId
          const isMutable = palette.mutable !== false

          return (
            <div
              key={palette.id}
              className={['palette-panel__item', isActive && 'palette-panel__item--active']
                .filter(Boolean)
                .join(' ')}
              role="button"
              tabIndex={0}
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
                <span className="palette-panel__meta">{palette.swatches.length} colors</span>
              </div>
              <div className="palette-panel__swatches">
                {palette.swatches.map((swatch) => (
                  <button
                    key={swatch.id}
                    type="button"
                    className="palette-panel__swatch"
                    data-active={swatch.id === activeSwatchId || undefined}
                    style={{ backgroundColor: swatch.foreground ?? '#FFFFFF' }}
                    aria-label={`Use ${swatch.name || swatch.foreground}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      handleSwatchClick(palette.id, swatch.id, swatch.foreground ?? '#FFFFFF')
                    }}
                    onContextMenu={(event) =>
                      handleSwatchContextMenu(event, palette.id, swatch.id, isMutable)
                    }
                  />
                ))}
                {isMutable ? (
                  <button
                    type="button"
                    className="palette-panel__swatch palette-panel__swatch--add"
                    aria-label={`Add color to ${palette.name}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      setActivePalette(palette.id)
                      requestNewSwatch(palette.id)
                    }}
                  >
                    +
                  </button>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      <input
        ref={newSwatchInputRef}
        type="color"
        className="palette-panel__hidden-input"
        onChange={handleCreateSwatch}
      />
    </div>
  )
}
