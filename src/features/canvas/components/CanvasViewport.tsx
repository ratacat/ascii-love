import './CanvasViewport.css'

import { useCallback, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

import { useEditorStore } from '@shared/state/editorStore'
import { ExportMenu } from '@features/export/components/ExportMenu'
import type { GlyphInstance, PaletteSwatch, Vec2 } from '@shared/types/editor'

const CANVAS_UNIT_PX = 24

export function CanvasViewport() {
  const document = useEditorStore((state) => state.document)
  const cursor = useEditorStore((state) => state.cursor)
  const activeLayerId = useEditorStore((state) => state.activeLayerId)
  const activePaletteId = useEditorStore((state) => state.activePaletteId)
  const activeSwatchId = useEditorStore((state) => state.activeSwatchId)
  const activeGlyphChar = useEditorStore((state) => state.activeGlyphChar)
  const selection = useEditorStore((state) => state.selection)
  const placeGlyph = useEditorStore((state) => state.placeGlyph)
  const selectGlyphs = useEditorStore((state) => state.selectGlyphs)
  const clearSelection = useEditorStore((state) => state.clearSelection)

  const [hoveredPoint, setHoveredPoint] = useState<Vec2 | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)

  const activeLayer = useMemo(
    () => document.layers.find((layer) => layer.id === activeLayerId),
    [document.layers, activeLayerId],
  )

  const visibleLayers = useMemo(
    () =>
      [...document.layers]
        .filter((layer) => layer.visible)
        .sort((a, b) => a.zIndex - b.zIndex),
    [document.layers],
  )

  const paletteMap = useMemo(() => {
    const map = new Map<string, Map<string, PaletteSwatch>>()
    document.palettes.forEach((palette) => {
      map.set(palette.id, new Map(palette.swatches.map((swatch) => [swatch.id, swatch])))
    })
    return map
  }, [document.palettes])

  const glyphEntries = useMemo(() => {
    const entries: Array<{
      glyph: GlyphInstance
      layerZ: number
    }> = []
    visibleLayers.forEach((layer) => {
      layer.glyphs.forEach((glyph) => {
        entries.push({ glyph, layerZ: layer.zIndex })
      })
    })
    entries.sort((a, b) => a.layerZ - b.layerZ)
    return entries
  }, [visibleLayers])

  const pointerToDocumentPosition = useCallback(
    (event: { clientX: number; clientY: number }): Vec2 | null => {
      const rect = stageRef.current?.getBoundingClientRect()
      if (!rect) {
        return null
      }
      const x = (event.clientX - rect.left) / CANVAS_UNIT_PX
      const y = (event.clientY - rect.top) / CANVAS_UNIT_PX

      if (Number.isNaN(x) || Number.isNaN(y)) {
        return null
      }

      const maxX = document.width > 0 ? document.width - 1e-6 : 0
      const maxY = document.height > 0 ? document.height - 1e-6 : 0

      return {
        x: Math.min(Math.max(x, 0), maxX),
        y: Math.min(Math.max(y, 0), maxY),
      }
    },
    [document.height, document.width],
  )

  const applySnapping = useCallback(
    (position: Vec2): Vec2 => {
      if (!cursor.snapped) {
        return position
      }

      const snappedX = Math.round(position.x)
      const snappedY = Math.round(position.y)
      const maxX = document.width > 0 ? document.width - 1 : 0
      const maxY = document.height > 0 ? document.height - 1 : 0

      return {
        x: Math.min(Math.max(snappedX, 0), maxX),
        y: Math.min(Math.max(snappedY, 0), maxY),
      }
    },
    [cursor.snapped, document.height, document.width],
  )

  const handleStageInteraction = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const position = pointerToDocumentPosition(event)
      if (!position) {
        return
      }

      const adjusted = applySnapping(position)

      if (cursor.mode === 'place') {
        placeGlyph(adjusted)
        return
      }

      if (cursor.mode === 'select') {
        clearSelection()
      }
    },
    [applySnapping, clearSelection, cursor.mode, placeGlyph, pointerToDocumentPosition],
  )

  const handleGlyphInteraction = useCallback(
    (glyph: GlyphInstance, event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()

      if (cursor.mode === 'place') {
        const position = pointerToDocumentPosition(event)
        if (!position) {
          return
        }
        placeGlyph(applySnapping(position))
        return
      }

      if (cursor.mode === 'select') {
        selectGlyphs([glyph.id], { additive: event.shiftKey })
      }
    },
    [applySnapping, cursor.mode, placeGlyph, pointerToDocumentPosition, selectGlyphs],
  )

  const handlePointerMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const position = pointerToDocumentPosition(event)
      setHoveredPoint(position)
    },
    [pointerToDocumentPosition],
  )

  const stageDimensions = useMemo(
    () => ({
      width: document.width * CANVAS_UNIT_PX,
      height: document.height * CANVAS_UNIT_PX,
    }),
    [document.height, document.width],
  )

  const renderGlyph = useCallback(
    (entry: { glyph: GlyphInstance; layerZ: number }) => {
      const { glyph, layerZ } = entry
      const isSelected = selection.glyphIds.includes(glyph.id)
      const palette = paletteMap.get(glyph.paletteId)
      const swatch = palette?.get(glyph.swatchId)
      const foreground = glyph.foreground ?? swatch?.foreground ?? 'rgba(255, 255, 255, 0.9)'

      const style: CSSProperties = {
        left: glyph.position.x * CANVAS_UNIT_PX,
        top: glyph.position.y * CANVAS_UNIT_PX,
        zIndex: layerZ + 1,
        color: foreground,
      }

      return (
        <button
          key={glyph.id}
          type="button"
          className={[
            'canvas-viewport__glyph-node',
            glyph.char && 'canvas-viewport__glyph-node--filled',
            isSelected && 'canvas-viewport__glyph-node--selected',
          ]
            .filter(Boolean)
            .join(' ')}
          data-glyph-id={glyph.id}
          aria-pressed={isSelected}
          onClick={(event) => handleGlyphInteraction(glyph, event)}
          style={style}
        >
          <span className="canvas-viewport__glyph" aria-hidden>
            {glyph.char}
          </span>
        </button>
      )
    },
    [handleGlyphInteraction, paletteMap, selection.glyphIds],
  )

  const previewPoint = hoveredPoint && cursor.mode === 'place' ? applySnapping(hoveredPoint) : null
  const activePalette = activePaletteId ? paletteMap.get(activePaletteId) : undefined
  const activeSwatch = activeSwatchId ? activePalette?.get(activeSwatchId) : undefined

  return (
    <div className="canvas-viewport">
      <header className="canvas-viewport__meta">
        <div className="canvas-viewport__meta-info">
          <span className="canvas-viewport__title">{document.name}</span>
          <span className="canvas-viewport__dimensions">
            {document.width} × {document.height} glyphs
          </span>
          <span className="canvas-viewport__active-layer">
            Active Layer:
            <strong>{activeLayer?.name ?? 'None'}</strong>
          </span>
          <span className="canvas-viewport__cursor">
            Cursor:
            <strong>
              {hoveredPoint ? `${hoveredPoint.x.toFixed(2)}, ${hoveredPoint.y.toFixed(2)}` : '—'}
            </strong>
          </span>
        </div>
        <ExportMenu />
      </header>
      <div className="canvas-viewport__stage">
        <div
          className={[
            'canvas-viewport__surface',
            cursor.gridEnabled && 'canvas-viewport__surface--grid',
            cursor.crosshairEnabled && 'canvas-viewport__surface--crosshair',
          ]
            .filter(Boolean)
            .join(' ')}
          role="presentation"
        />
        <div
          ref={stageRef}
          className={[
            'canvas-viewport__canvas',
            `canvas-viewport__canvas--${cursor.mode}`,
            previewPoint && activeGlyphChar && 'canvas-viewport__canvas--cursorless',
          ]
            .filter(Boolean)
            .join(' ')}
          style={
            {
              width: stageDimensions.width,
              height: stageDimensions.height,
            } as CSSProperties
          }
          onClick={handleStageInteraction}
          onMouseMove={handlePointerMove}
          onMouseLeave={() => setHoveredPoint(null)}
        >
          {glyphEntries.map(renderGlyph)}
          {previewPoint && activeGlyphChar ? (
            <div
              className="canvas-viewport__cursor-preview"
              style={{
                left: previewPoint.x * CANVAS_UNIT_PX,
                top: previewPoint.y * CANVAS_UNIT_PX,
                color: activeSwatch?.foreground ?? 'rgba(255, 255, 255, 0.6)',
              }}
            >
              {activeGlyphChar}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
