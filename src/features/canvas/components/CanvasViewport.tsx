import './CanvasViewport.css'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

import { useEditorStore } from '@shared/state/editorStore'
import { ExportMenu } from '@features/export/components/ExportMenu'
import type { GlyphInstance, PaletteSwatch, Vec2 } from '@shared/types/editor'
import { BASE_UNIT_PX } from '@shared/constants/canvas'

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
  const viewport = useEditorStore((state) => state.viewport)
  const panViewport = useEditorStore((state) => state.panViewport)
  const zoomViewport = useEditorStore((state) => state.zoomViewport)
  const nudgeCursorRotation = useEditorStore((state) => state.nudgeCursorRotation)

  const unitSize = BASE_UNIT_PX * viewport.scale
  const paddingUnits = 200
  const paddingPx = paddingUnits * unitSize
  const [hoveredPoint, setHoveredPoint] = useState<Vec2 | null>(null)
  const [marquee, setMarquee] = useState<{
    origin: Vec2
    current: Vec2
    additive: boolean
  } | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const marqueeBaseSelectionRef = useRef<string[]>([])

  const releaseEditingFocus = useCallback(() => {
    const active = document.activeElement
    if (active instanceof HTMLElement && active.matches('.group-panel__item-input')) {
      active.blur()
    }
  }, [])

  const stageDimensions = useMemo(() => {
    const width = (document.width + paddingUnits * 2) * unitSize
    const height = (document.height + paddingUnits * 2) * unitSize
    return { width, height }
  }, [document.height, document.width, paddingUnits, unitSize])

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
      const x = (event.clientX - rect.left) / unitSize - paddingUnits
      const y = (event.clientY - rect.top) / unitSize - paddingUnits

      if (Number.isNaN(x) || Number.isNaN(y)) {
        return null
      }

      return { x, y }
    },
    [paddingUnits, unitSize],
  )

  const applySnapping = useCallback(
    (position: Vec2): Vec2 => {
      if (!cursor.snapped) {
        return position
      }

      const snappedX = Math.round(position.x)
      const snappedY = Math.round(position.y)

      return {
        x: snappedX,
        y: snappedY,
      }
    },
    [cursor.snapped],
  )

  const handleStageInteraction = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (cursor.mode !== 'place') {
        return
      }
      const position = pointerToDocumentPosition(event)
      if (!position) {
        return
      }
      const adjusted = applySnapping(position)
      placeGlyph(adjusted)
    },
    [applySnapping, cursor.mode, placeGlyph, pointerToDocumentPosition],
  )

  const updateMarqueeSelection = useCallback(
    (marqueeState: { origin: Vec2; current: Vec2; additive: boolean }) => {
      const minX = Math.min(marqueeState.origin.x, marqueeState.current.x)
      const maxX = Math.max(marqueeState.origin.x, marqueeState.current.x)
      const minY = Math.min(marqueeState.origin.y, marqueeState.current.y)
      const maxY = Math.max(marqueeState.origin.y, marqueeState.current.y)

      const touchedIds: string[] = []
      for (const entry of glyphEntries) {
        const glyph = entry.glyph
        const glyphMinX = glyph.position.x
        const glyphMaxX = glyph.position.x + 1
        const glyphMinY = glyph.position.y
        const glyphMaxY = glyph.position.y + 1

        const intersects =
          glyphMinX <= maxX && glyphMaxX >= minX && glyphMinY <= maxY && glyphMaxY >= minY

        if (intersects) {
          touchedIds.push(glyph.id)
        }
      }

      if (marqueeState.additive) {
        const base = new Set(marqueeBaseSelectionRef.current)
        touchedIds.forEach((id) => base.add(id))
        selectGlyphs(Array.from(base))
      } else {
        selectGlyphs(touchedIds)
      }
    },
    [glyphEntries, selectGlyphs],
  )

  const handleGlyphInteraction = useCallback(
    (glyph: GlyphInstance, event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      releaseEditingFocus()

      if (cursor.mode === 'place') {
        const position = pointerToDocumentPosition(event)
        if (!position) {
          return
        }
        placeGlyph(applySnapping(position))
        return
      }

      if (cursor.mode === 'select') {
        if (event.shiftKey) {
          selectGlyphs([glyph.id], { toggle: true })
        } else {
          selectGlyphs([glyph.id])
        }
      }
    },
    [applySnapping, cursor.mode, placeGlyph, pointerToDocumentPosition, releaseEditingFocus, selectGlyphs],
  )

  const handleStageMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.button !== 0 || cursor.mode !== 'select') {
        return
      }
      if (event.target !== event.currentTarget) {
        return
      }
      releaseEditingFocus()
      const position = pointerToDocumentPosition(event)
      if (!position) {
        return
      }
      event.preventDefault()
      const additive = event.shiftKey
      marqueeBaseSelectionRef.current = additive ? [...selection.glyphIds] : []
      setMarquee({
        origin: position,
        current: position,
        additive,
      })
    },
    [cursor.mode, pointerToDocumentPosition, releaseEditingFocus, selection.glyphIds],
  )

  const finalizeMarquee = useCallback(
    (event?: MouseEvent | React.MouseEvent) => {
      setMarquee((prev) => {
        if (!prev) {
          return prev
        }
        let nextState = prev
        if (event) {
          const position = pointerToDocumentPosition(event)
          if (position) {
            nextState = { ...prev, current: position }
          }
        }
        updateMarqueeSelection(nextState)
        marqueeBaseSelectionRef.current = []
        return null
      })
    },
    [pointerToDocumentPosition, updateMarqueeSelection],
  )

  useEffect(() => {
    const handleWindowMouseUp = (event: MouseEvent) => finalizeMarquee(event)
    window.addEventListener('mouseup', handleWindowMouseUp)
    return () => window.removeEventListener('mouseup', handleWindowMouseUp)
  }, [finalizeMarquee])

const handlePointerMove = useCallback(
  (event: React.MouseEvent<HTMLDivElement>) => {
    const position = pointerToDocumentPosition(event)
    setHoveredPoint(position)

    if (!marquee || !position) {
      return
    }

    event.preventDefault()
    setMarquee((previous) => {
      if (!previous) {
        return previous
      }
      const next = { ...previous, current: position }
      updateMarqueeSelection(next)
      return next
    })
  },
  [marquee, pointerToDocumentPosition, updateMarqueeSelection],
)

  useEffect(() => {
    const node = stageRef.current
    if (!node) {
      return
    }

    const handleWheel = (event: WheelEvent) => {

      if (event.shiftKey) {
        event.preventDefault()
        if (cursor.mode === 'place') {
          const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY)
          const delta = horizontal ? event.deltaX : event.deltaY
          const rotationIntensity = 0.2
          nudgeCursorRotation(-delta * rotationIntensity)
        }
        return
      }

      const docAnchor = pointerToDocumentPosition(event)
      if (!docAnchor) {
        return
      }
      const anchorBase = {
        x: docAnchor.x * unitSize + viewport.offset.x,
        y: docAnchor.y * unitSize + viewport.offset.y,
      }

      if (event.metaKey) {
        event.preventDefault()
        const zoomIntensity = 0.0015
        const scaleFactor = Math.exp(-event.deltaY * zoomIntensity)
        zoomViewport(scaleFactor, anchorBase)
        return
      }

      if (event.ctrlKey) {
        event.preventDefault()
        const zoomIntensity = 0.0015
        const scaleFactor = Math.exp(-event.deltaY * zoomIntensity)
        zoomViewport(scaleFactor, anchorBase)
        return
      }

      event.preventDefault()
      panViewport({ x: -event.deltaX, y: -event.deltaY })
    }

    node.addEventListener('wheel', handleWheel, { passive: false })
    return () => node.removeEventListener('wheel', handleWheel)
  }, [
    cursor.mode,
    nudgeCursorRotation,
    panViewport,
    paddingUnits,
    pointerToDocumentPosition,
    unitSize,
    zoomViewport,
  ])

  const marqueeRect = useMemo(() => {
    if (!marquee || (marquee.origin.x === marquee.current.x && marquee.origin.y === marquee.current.y)) {
      return null
    }

    const left = (Math.min(marquee.origin.x, marquee.current.x) + paddingUnits) * unitSize
    const top = (Math.min(marquee.origin.y, marquee.current.y) + paddingUnits) * unitSize
    return {
      left,
      top,
      width: Math.abs(marquee.origin.x - marquee.current.x) * unitSize,
      height: Math.abs(marquee.origin.y - marquee.current.y) * unitSize,
    }
  }, [marquee, paddingUnits, unitSize])

  const previewPoint = hoveredPoint && cursor.mode === 'place' ? applySnapping(hoveredPoint) : null
  const cursorScaleLabel = useMemo(() => `×${cursor.scale.toFixed(2).replace(/\.?0+$/, '')}`, [
    cursor.scale,
  ])
  const cursorPreviewTransform = useMemo(() => {
    const transforms: string[] = []
    if (cursor.rotation) {
      transforms.push(`rotate(${cursor.rotation}deg)`)
    }
    if (cursor.scale !== 1) {
      transforms.push(`scale(${cursor.scale})`)
    }
    return transforms.join(' ') || undefined
  }, [cursor.rotation, cursor.scale])

  const crosshairPoint = useMemo(() => {
    if (!hoveredPoint) {
      return undefined
    }
    if (cursor.mode === 'place' && previewPoint) {
      return previewPoint
    }
    return cursor.snapped ? applySnapping(hoveredPoint) : hoveredPoint
  }, [cursor.mode, cursor.snapped, hoveredPoint, previewPoint, applySnapping])

  const crosshairBounds = useMemo(() => {
    if (!cursor.crosshairEnabled || !crosshairPoint) {
      return undefined
    }

    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
    const clampedX = clamp(
      crosshairPoint.x,
      -paddingUnits,
      document.width + paddingUnits - 1,
    )
    const clampedY = clamp(
      crosshairPoint.y,
      -paddingUnits,
      document.height + paddingUnits - 1,
    )
    const left = Math.round((clampedX + paddingUnits) * unitSize)
    const top = Math.round((clampedY + paddingUnits) * unitSize)

    return {
      top,
      bottom: top + unitSize,
      left,
      right: left + unitSize,
    }
  }, [
    crosshairPoint,
    cursor.crosshairEnabled,
    document.height,
    document.width,
    paddingUnits,
    unitSize,
  ])

  const stageOffsetStyle = useMemo(
    () =>
      ({
        transform: `translate3d(${-paddingPx}px, ${-paddingPx}px, 0)`,
        transformOrigin: '0 0',
        willChange: 'transform',
      }) as CSSProperties,
    [paddingPx],
  )

  const canvasStyle = useMemo(
    () =>
      ({
        width: stageDimensions.width,
        height: stageDimensions.height,
        transform: `translate3d(${viewport.offset.x}px, ${viewport.offset.y}px, 0)`,
        transformOrigin: '0 0',
        willChange: 'transform',
        '--canvas-unit-size': `${unitSize}px`,
        '--glyph-font-size': `${unitSize * 0.85}px`,
      }) as CSSProperties & Record<string, string>,
    [
      stageDimensions.height,
      stageDimensions.width,
      unitSize,
      viewport.offset.x,
      viewport.offset.y,
    ],
  )

  const renderGlyph = useCallback(
    (entry: { glyph: GlyphInstance; layerZ: number }) => {
      const { glyph, layerZ } = entry
      const isSelected = selection.glyphIds.includes(glyph.id)
      const palette = paletteMap.get(glyph.paletteId)
      const swatch = glyph.swatchId ? palette?.get(glyph.swatchId) : undefined
      const foreground = glyph.foreground ?? swatch?.foreground ?? 'rgba(255, 255, 255, 0.9)'

      const style: CSSProperties = {
        left: Math.round((glyph.position.x + paddingUnits) * unitSize),
        top: Math.round((glyph.position.y + paddingUnits) * unitSize),
        zIndex: layerZ + 1,
        color: foreground,
        width: unitSize,
        height: unitSize,
        fontSize: `${unitSize * 0.85}px`,
      }
      const transformParts: string[] = []
      const translation = glyph.transform?.translation
      const scale = glyph.transform?.scale
      const rotation = glyph.transform?.rotation ?? 0

      if (translation && (translation.x !== 0 || translation.y !== 0)) {
        transformParts.push(
          `translate(${translation.x * unitSize}px, ${translation.y * unitSize}px)`,
        )
      }

      if (rotation) {
        transformParts.push(`rotate(${rotation}deg)`)
      }

      const scaleX = scale?.x ?? 1
      const scaleY = scale?.y ?? 1
      if (scaleX !== 1 || scaleY !== 1) {
        transformParts.push(`scale(${scaleX}, ${scaleY})`)
      }

      if (transformParts.length) {
        style.transform = transformParts.join(' ')
      }
      style.transformOrigin = '50% 50%'

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
    [handleGlyphInteraction, paddingUnits, paletteMap, selection.glyphIds, unitSize],
  )
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
          <span className="canvas-viewport__scale">
            Placement Scale:
            <strong>{cursorScaleLabel}</strong>
          </span>
        </div>
        <ExportMenu />
      </header>
      <div className="canvas-viewport__stage">
        <div className="canvas-viewport__canvas-wrapper" style={stageOffsetStyle}>
          <div
            ref={stageRef}
            className={[
              'canvas-viewport__canvas',
              `canvas-viewport__canvas--${cursor.mode}`,
              previewPoint && activeGlyphChar && 'canvas-viewport__canvas--cursorless',
            ]
              .filter(Boolean)
              .join(' ')}
            style={canvasStyle}
            onClick={handleStageInteraction}
            onMouseDown={handleStageMouseDown}
            onMouseMove={handlePointerMove}
            onMouseUp={(event) => finalizeMarquee(event)}
            onMouseLeave={() => {
              setHoveredPoint(null)
            }}
          >
            <div
              className={[
                'canvas-viewport__surface',
                cursor.gridEnabled && 'canvas-viewport__surface--grid',
              ]
                .filter(Boolean)
                .join(' ')}
              role="presentation"
            />
            {marqueeRect ? (
              <div
                className="canvas-viewport__marquee"
                style={{
                  left: marqueeRect.left,
                  top: marqueeRect.top,
                  width: marqueeRect.width,
                  height: marqueeRect.height,
                }}
              />
            ) : null}
            {crosshairBounds ? (
              <div className="canvas-viewport__crosshair" aria-hidden>
                <div
                  className="canvas-viewport__crosshair-line canvas-viewport__crosshair-line--horizontal"
                  style={{ top: crosshairBounds.top }}
                />
                <div
                  className="canvas-viewport__crosshair-line canvas-viewport__crosshair-line--horizontal"
                  style={{
                    top: Math.max(
                      0,
                      Math.min(stageDimensions.height - 1, crosshairBounds.bottom - 1),
                    ),
                  }}
                />
                <div
                  className="canvas-viewport__crosshair-line canvas-viewport__crosshair-line--vertical"
                  style={{ left: crosshairBounds.left }}
                />
                <div
                  className="canvas-viewport__crosshair-line canvas-viewport__crosshair-line--vertical"
                  style={{
                    left: Math.max(
                      0,
                      Math.min(stageDimensions.width - 1, crosshairBounds.right - 1),
                    ),
                  }}
                />
              </div>
            ) : null}
            {glyphEntries.map(renderGlyph)}
            {previewPoint && activeGlyphChar ? (
              <div
                className="canvas-viewport__cursor-preview"
                style={{
                  left: Math.round((previewPoint.x + paddingUnits) * unitSize),
                  top: Math.round((previewPoint.y + paddingUnits) * unitSize),
                  color: activeSwatch?.foreground ?? 'rgba(255, 255, 255, 0.6)',
                  transform: cursorPreviewTransform,
                  transformOrigin: '50% 50%',
                  width: unitSize,
                  height: unitSize,
                  fontSize: `${unitSize * 0.85}px`,
                }}
              >
                {activeGlyphChar}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
