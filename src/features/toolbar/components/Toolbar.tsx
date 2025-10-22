import './Toolbar.css'

import { TOOLBAR_TOOLS } from '@shared/constants/tools'
import { useEditorStore } from '@shared/state/editorStore'
import { DocumentControls } from './DocumentControls'

export function Toolbar() {
  const activeMode = useEditorStore((state) => state.cursor.mode)
  const setCursorMode = useEditorStore((state) => state.setCursorMode)
  const showGrid = useEditorStore((state) => state.preferences.showGrid)
  const showCrosshair = useEditorStore((state) => state.preferences.showCrosshair)
  const setPreferences = useEditorStore((state) => state.setPreferences)

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
