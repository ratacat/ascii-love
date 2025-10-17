import './CanvasViewport.css'

import { useMemo } from 'react'

import { useEditorStore } from '@shared/state/editorStore'

export function CanvasViewport() {
  const document = useEditorStore((state) => state.document)
  const cursor = useEditorStore((state) => state.cursor)
  const activeLayerId = useEditorStore((state) => state.activeLayerId)

  const activeLayer = useMemo(
    () => document.layers.find((layer) => layer.id === activeLayerId),
    [document.layers, activeLayerId],
  )

  return (
    <div className="canvas-viewport">
      <header className="canvas-viewport__meta">
        <span className="canvas-viewport__title">{document.name}</span>
        <span className="canvas-viewport__dimensions">
          {document.width} × {document.height} glyphs
        </span>
        <span className="canvas-viewport__active-layer">
          Active Layer:
          <strong>{activeLayer?.name ?? 'None'}</strong>
        </span>
      </header>
      <div
        className={[
          'canvas-viewport__surface',
          cursor.gridEnabled && 'canvas-viewport__surface--grid',
        ]
          .filter(Boolean)
          .join(' ')}
        role="presentation"
      >
        {cursor.crosshairEnabled ? (
          <div className="canvas-viewport__crosshair" aria-hidden />
        ) : null}
        <div className="canvas-viewport__placeholder">
          <span className="canvas-viewport__placeholder-glyph">▒░▒</span>
          <p>
            Use <strong>Place</strong> mode to draft glyphs on the canvas, or{' '}
            <strong>Select</strong> to manipulate existing instances.
          </p>
        </div>
      </div>
    </div>
  )
}
