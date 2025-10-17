import './LayersPanel.css'

import { useEditorStore } from '@shared/state/editorStore'

export function LayersPanel() {
  const layers = useEditorStore((state) => state.document.layers)
  const activeLayerId = useEditorStore((state) => state.activeLayerId)
  const setActiveLayer = useEditorStore((state) => state.setActiveLayer)

  return (
    <div className="layers-panel">
      <ul className="layers-panel__list">
        {layers.map((layer) => {
          const isActive = layer.id === activeLayerId

          return (
            <li key={layer.id}>
              <button
                type="button"
                className={['layers-panel__item', isActive && 'layers-panel__item--active']
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setActiveLayer(layer.id)}
              >
                <span
                  aria-hidden
                  className={[
                    'layers-panel__visibility',
                    layer.visible && 'layers-panel__visibility--on',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  ●
                </span>
                <span className="layers-panel__name">{layer.name}</span>
                <span className="layers-panel__glyph-count">
                  {layer.glyphs.length} glyph{layer.glyphs.length === 1 ? '' : 's'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <button className="layers-panel__action" type="button" disabled>
        + New Layer (coming soon)
      </button>
    </div>
  )
}
