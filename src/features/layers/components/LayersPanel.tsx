import './LayersPanel.css'

import { useMemo } from 'react'

import { useEditorStore } from '@shared/state/editorStore'
import { showPromptDialog } from '@shared/state/dialogStore'

export function LayersPanel() {
  const layers = useEditorStore((state) => state.document.layers)
  const activeLayerId = useEditorStore((state) => state.activeLayerId)
  const setActiveLayer = useEditorStore((state) => state.setActiveLayer)
  const toggleLayerVisibility = useEditorStore((state) => state.toggleLayerVisibility)
  const moveLayer = useEditorStore((state) => state.moveLayer)
  const addLayer = useEditorStore((state) => state.addLayer)
  const renameLayer = useEditorStore((state) => state.renameLayer)

  const sortedLayers = useMemo(
    () => [...layers].sort((a, b) => a.zIndex - b.zIndex),
    [layers],
  )

  return (
    <div className="layers-panel">
      <ul className="layers-panel__list">
        {sortedLayers.map((layer) => {
          const isActive = layer.id === activeLayerId

          return (
            <li key={layer.id} className="layers-panel__row">
              <button
                type="button"
                className={['layers-panel__item', isActive && 'layers-panel__item--active']
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setActiveLayer(layer.id)}
                onDoubleClick={() => {
                  void (async () => {
                    const input = await showPromptDialog({
                      title: 'Rename Layer',
                      message: 'Rename layer',
                      defaultValue: layer.name,
                      confirmLabel: 'Rename',
                    })
                    if (!input) {
                      return
                    }
                    const trimmed = input.trim()
                    if (!trimmed) {
                      return
                    }
                    renameLayer(layer.id, trimmed)
                  })()
                }}
              >
                <span
                  aria-hidden
                  className={[
                    'layers-panel__visibility-indicator',
                    layer.visible && 'layers-panel__visibility-indicator--on',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                />
                <span className="layers-panel__name">{layer.name}</span>
                <span className="layers-panel__glyph-count">
                  {layer.glyphs.length} glyph{layer.glyphs.length === 1 ? '' : 's'}
                </span>
              </button>
              <div className="layers-panel__actions">
                <button
                  type="button"
                  className="layers-panel__action-button"
                  aria-label={layer.visible ? 'Hide layer' : 'Show layer'}
                  onClick={() => toggleLayerVisibility(layer.id)}
                >
                  {layer.visible ? '👁' : '🚫'}
                </button>
                <button
                  type="button"
                  className="layers-panel__action-button"
                  aria-label="Move layer forward"
                  onClick={() => moveLayer(layer.id, 'up')}
                >
                  ▲
                </button>
                <button
                  type="button"
                  className="layers-panel__action-button"
                  aria-label="Move layer backward"
                  onClick={() => moveLayer(layer.id, 'down')}
                >
                  ▼
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      <button className="layers-panel__action" type="button" onClick={() => addLayer()}>
        + New Layer
      </button>
    </div>
  )
}
