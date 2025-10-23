import './PalettePanel.css'

import { useMemo, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'

import { useEditorStore } from '@shared/state/editorStore'

const formatHex = (value: string): string => value.toUpperCase()
const SWATCH_DRAG_TYPE = 'application/x-asciilove-swatch'

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
  const addPalette = useEditorStore((state) => state.addPalette)
  const renamePalette = useEditorStore((state) => state.renamePalette)
  const removePalette = useEditorStore((state) => state.removePalette)
  const moveSwatch = useEditorStore((state) => state.moveSwatch)

  const resolvedPaletteId = activePaletteId ?? palettes[0]?.id
  const activePalette = useMemo(
    () => palettes.find((palette) => palette.id === resolvedPaletteId),
    [palettes, resolvedPaletteId],
  )

  const activeColorInputRef = useRef<HTMLInputElement>(null)
  const newSwatchInputRef = useRef<HTMLInputElement>(null)
  const [pendingPaletteId, setPendingPaletteId] = useState<string | null>(null)
  const [dragState, setDragState] = useState<
    | {
        paletteId: string
        swatchId: string
        targetSwatchId?: string
        position?: 'before' | 'after'
        dropAtEnd?: boolean
      }
    | null
  >(null)

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

  const handleCreatePalette = () => {
    if (typeof window === 'undefined' || typeof window.prompt !== 'function') {
      addPalette({})
      return
    }
    const suggestedName =
      palettes.length > 0 ? `Palette ${palettes.length + 1}` : 'Palette 1'
    const input = window.prompt('Name new palette', suggestedName)
    if (input === null) {
      return
    }
    const trimmed = input.trim()
    addPalette({ name: trimmed || undefined })
  }

  const handleRenamePalette = (paletteId: string, currentName: string) => {
    if (typeof window === 'undefined' || typeof window.prompt !== 'function') {
      renamePalette(paletteId, currentName)
      return
    }
    const input = window.prompt('Rename palette', currentName)
    if (input === null) {
      return
    }
    const trimmed = input.trim()
    if (!trimmed) {
      return
    }
    renamePalette(paletteId, trimmed)
  }

  const handleDeletePalette = (paletteId: string, paletteName: string) => {
    if (typeof window === 'undefined' || typeof window.confirm !== 'function') {
      removePalette(paletteId)
      return
    }
    const confirmed = window.confirm(
      `Delete palette "${paletteName}"?\nGlyphs using it will fall back to the first remaining palette.`,
    )
    if (!confirmed) {
      return
    }
    removePalette(paletteId)
  }

  const parseSwatchDragPayload = (data: string) => {
    if (!data) {
      return null
    }
    try {
      const parsed = JSON.parse(data) as { paletteId?: unknown; swatchId?: unknown }
      if (typeof parsed.paletteId === 'string' && typeof parsed.swatchId === 'string') {
        return parsed as { paletteId: string; swatchId: string }
      }
      return null
    } catch (error) {
      return null
    }
  }

  const handleSwatchDragStart = (
    event: DragEvent<HTMLButtonElement>,
    paletteId: string,
    swatchId: string,
  ) => {
    if (!event.dataTransfer) {
      return
    }
    setDragState({ paletteId, swatchId })
    event.dataTransfer.effectAllowed = 'move'
    try {
      event.dataTransfer.setData(
        SWATCH_DRAG_TYPE,
        JSON.stringify({ paletteId, swatchId }),
      )
    } catch (error) {
      event.dataTransfer.setData('text/plain', swatchId)
    }
  }

  const handleSwatchDragOver = (
    event: DragEvent<HTMLButtonElement>,
    paletteId: string,
    swatchId: string,
  ) => {
    if (!dragState || dragState.paletteId !== paletteId || dragState.swatchId === swatchId) {
      return
    }
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    const isAfter = event.clientX - rect.left > rect.width / 2
    event.dataTransfer.dropEffect = 'move'
    setDragState((previous) => {
      if (!previous || previous.paletteId !== paletteId) {
        return previous
      }
      return {
        ...previous,
        targetSwatchId: swatchId,
        position: isAfter ? 'after' : 'before',
        dropAtEnd: false,
      }
    })
  }

  const handleSwatchDrop = (
    event: DragEvent<HTMLButtonElement>,
    paletteId: string,
    swatchId: string,
  ) => {
    const data = event.dataTransfer?.getData(SWATCH_DRAG_TYPE)
    const payload = parseSwatchDragPayload(data)
    if (!payload || payload.paletteId !== paletteId) {
      setDragState(null)
      return
    }
    event.preventDefault()
    event.stopPropagation()
    const rect = event.currentTarget.getBoundingClientRect()
    const isAfter = event.clientX - rect.left > rect.width / 2
    moveSwatch(paletteId, payload.swatchId, {
      targetSwatchId: swatchId,
      position: isAfter ? 'after' : 'before',
    })
    setDragState(null)
  }

  const handleSwatchDragEnd = () => {
    setDragState(null)
  }

  const handleSwatchContainerDragOver = (
    event: DragEvent<HTMLDivElement>,
    paletteId: string,
  ) => {
    if (!dragState || dragState.paletteId !== paletteId) {
      return
    }
    if (event.target !== event.currentTarget) {
      return
    }
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragState((previous) => {
      if (!previous || previous.paletteId !== paletteId) {
        return previous
      }
      return {
        ...previous,
        targetSwatchId: undefined,
        position: 'after',
        dropAtEnd: true,
      }
    })
  }

  const handleSwatchContainerDrop = (
    event: DragEvent<HTMLDivElement>,
    paletteId: string,
  ) => {
    if (event.target !== event.currentTarget) {
      return
    }
    const data = event.dataTransfer?.getData(SWATCH_DRAG_TYPE)
    const payload = parseSwatchDragPayload(data)
    if (!payload || payload.paletteId !== paletteId) {
      setDragState(null)
      return
    }
    event.preventDefault()
    event.stopPropagation()
    moveSwatch(paletteId, payload.swatchId, { position: 'after' })
    setDragState(null)
  }

  const requestNewSwatch = (paletteId: string) => {
    setPendingPaletteId(paletteId)
    newSwatchInputRef.current?.click()
  }

  const handleCreateSwatch = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    event.target.value = '#ffffff'
    if (!pendingPaletteId || !value) {
      setPendingPaletteId(null)
      return
    }
    addSwatch(pendingPaletteId, { foreground: value })
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
        <div className="palette-panel__palettes-header">
          <span className="palette-panel__section-label">Palettes</span>
          <button
            type="button"
            className="palette-panel__toolbar-button"
            onClick={handleCreatePalette}
          >
            + New Palette
          </button>
        </div>
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
                <div className="palette-panel__title">
                  <span className="palette-panel__name">{palette.name}</span>
                  <span className="palette-panel__meta">
                    {palette.swatches.length} color{palette.swatches.length === 1 ? '' : 's'}
                  </span>
                </div>
                {isMutable ? (
                  <div className="palette-panel__item-actions">
                    <button
                      type="button"
                      className="palette-panel__item-button"
                      aria-label={`Rename ${palette.name}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        handleRenamePalette(palette.id, palette.name)
                      }}
                    >
                      Rename
                    </button>
                    {palettes.length > 1 ? (
                      <button
                        type="button"
                        className="palette-panel__item-button palette-panel__item-button--danger"
                        aria-label={`Delete ${palette.name}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          handleDeletePalette(palette.id, palette.name)
                        }}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div
                className="palette-panel__swatches"
                data-drop-end={
                  dragState &&
                  dragState.paletteId === palette.id &&
                  dragState.dropAtEnd
                    ? ''
                    : undefined
                }
                onDragOver={(event) => handleSwatchContainerDragOver(event, palette.id)}
                onDrop={(event) => handleSwatchContainerDrop(event, palette.id)}
              >
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
                    draggable={isMutable && palette.swatches.length > 1}
                    onDragStart={(event) => handleSwatchDragStart(event, palette.id, swatch.id)}
                    onDragOver={(event) => handleSwatchDragOver(event, palette.id, swatch.id)}
                    onDrop={(event) => handleSwatchDrop(event, palette.id, swatch.id)}
                    onDragEnd={handleSwatchDragEnd}
                    data-drop-before={
                      dragState &&
                      dragState.paletteId === palette.id &&
                      dragState.targetSwatchId === swatch.id &&
                      dragState.position === 'before'
                        ? ''
                        : undefined
                    }
                    data-drop-after={
                      dragState &&
                      dragState.paletteId === palette.id &&
                      dragState.targetSwatchId === swatch.id &&
                      dragState.position === 'after'
                        ? ''
                        : undefined
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
