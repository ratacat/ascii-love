import './Toolbar.css'

import { useEffect, useId, useRef, useState } from 'react'

import { TOOLBAR_TOOLS } from '@shared/constants/tools'
import { useEditorStore } from '@shared/state/editorStore'
import { DocumentControls } from './DocumentControls'

export function Toolbar() {
  const activeMode = useEditorStore((state) => state.cursor.mode)
  const setCursorMode = useEditorStore((state) => state.setCursorMode)
  const showGrid = useEditorStore((state) => state.preferences.showGrid)
  const showCrosshair = useEditorStore((state) => state.preferences.showCrosshair)
  const setPreferences = useEditorStore((state) => state.setPreferences)
  const snapEnabled = useEditorStore((state) => state.cursor.snapped)
  const snapIntervalPx = useEditorStore((state) => state.cursor.snapIntervalPx)
  const setSnapToGrid = useEditorStore((state) => state.setSnapToGrid)
  const setSnapToGridIntervalPx = useEditorStore((state) => state.setSnapToGridIntervalPx)
  const snapIntervalInputRef = useRef<HTMLInputElement | null>(null)
  const snapIntervalInputId = useId()
  const [snapIntervalDraft, setSnapIntervalDraft] = useState(() => snapIntervalPx.toString())

  useEffect(() => {
    setSnapIntervalDraft(snapIntervalPx.toString())
  }, [snapIntervalPx])

  const commitSnapInterval = () => {
    const parsed = Number.parseInt(snapIntervalDraft, 10)
    if (Number.isFinite(parsed)) {
      setSnapToGridIntervalPx(parsed)
    } else {
      setSnapIntervalDraft(snapIntervalPx.toString())
    }
  }

  return (
    <header className="toolbar" aria-label="Primary editor controls">
      <div className="toolbar__group" role="toolbar" aria-label="Cursor modes">
        {TOOLBAR_TOOLS.map((tool) => {
          const isActive = tool.id === activeMode
          return (
            <button
              key={tool.id}
              type="button"
              className={['toolbar__button', isActive && 'toolbar__button--active']
                .filter(Boolean)
                .join(' ')}
              aria-pressed={isActive}
              onClick={() => setCursorMode(tool.id)}
              title={`${tool.label} (${tool.hotkey})`}
            >
              <span aria-hidden className="toolbar__icon">
                {tool.icon}
              </span>
              <span className="toolbar__label">{tool.label}</span>
              <kbd className="toolbar__hotkey">{tool.hotkey}</kbd>
            </button>
          )
        })}
      </div>

      <div className="toolbar__spacer" />

      <DocumentControls />

      <div className="toolbar__toggles" aria-label="Viewport toggles">
        <div className="toolbar__snap-control">
          <label className="toolbar__toggle">
            <input
              type="checkbox"
              checked={snapEnabled}
              onChange={(event) => {
                const enabled = event.target.checked
                setSnapToGrid(enabled)
              }}
              aria-controls={snapIntervalInputId}
            />
            <span>Snap</span>
          </label>
          <div className="toolbar__snap-input">
            <input
              ref={snapIntervalInputRef}
              id={snapIntervalInputId}
              type="number"
              min={1}
              max={512}
              inputMode="numeric"
              pattern="[0-9]*"
              aria-label="Snap interval (pixels)"
              value={snapIntervalDraft}
              onChange={(event) => {
                setSnapIntervalDraft(event.target.value.replace(/[^\d]/g, ''))
              }}
              onBlur={commitSnapInterval}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  commitSnapInterval()
                }
                if (event.key === 'Escape') {
                  event.preventDefault()
                  setSnapIntervalDraft(snapIntervalPx.toString())
                  window.requestAnimationFrame(() => {
                    snapIntervalInputRef.current?.blur()
                  })
                }
              }}
              disabled={!snapEnabled}
            />
            <span className="toolbar__snap-suffix">px</span>
          </div>
        </div>
        <label className="toolbar__toggle">
          <input
            type="checkbox"
            checked={showGrid}
            onChange={() => setPreferences({ showGrid: !showGrid })}
          />
          <span>Grid</span>
        </label>
        <label className="toolbar__toggle">
          <input
            type="checkbox"
            checked={showCrosshair}
            onChange={() => setPreferences({ showCrosshair: !showCrosshair })}
          />
          <span>Crosshair</span>
        </label>
      </div>

      <div className="toolbar__brand">
        <span className="toolbar__product">ASCII Asset Studio</span>
      </div>
    </header>
  )
}
