import './InspectorPanel.css'

import { useMemo } from 'react'

import { useEditorStore } from '@shared/state/editorStore'

export function InspectorPanel() {
  const selection = useEditorStore((state) => state.selection)
  const document = useEditorStore((state) => state.document)

  const activeGroups = useMemo(
    () =>
      document.groups.filter((group) =>
        selection.groupIds.includes(group.id),
      ),
    [document.groups, selection.groupIds],
  )

  const selectionSummary = selection.glyphIds.length
    ? `${selection.glyphIds.length} glyph${selection.glyphIds.length === 1 ? '' : 's'}`
    : 'No glyphs selected'

  return (
    <div className="inspector-panel">
      <section>
        <header className="inspector-panel__section-title">Selection</header>
        <p className="inspector-panel__metric">{selectionSummary}</p>
        {selection.layerIds.length ? (
          <p className="inspector-panel__meta">
            Layers:{' '}
            {selection.layerIds
              .map((layerId) => document.layers.find((layer) => layer.id === layerId)?.name ?? 'Unknown')
              .join(', ')}
          </p>
        ) : null}
      </section>

      <section>
        <header className="inspector-panel__section-title">Addressable Groups</header>
        {activeGroups.length ? (
          <ul className="inspector-panel__list">
            {activeGroups.map((group) => (
              <li key={group.id}>
                <span className="inspector-panel__group-name">{group.name}</span>
                {group.addressableKey ? (
                  <code className="inspector-panel__code">{group.addressableKey}</code>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="inspector-panel__empty">
            Tag selections with addressable keys so the runtime can theme them dynamically.
          </p>
        )}
      </section>

      <section>
        <header className="inspector-panel__section-title">Next Steps</header>
        <ol className="inspector-panel__actions">
          <li>Double-click a glyph to add metadata.</li>
          <li>Mark key groups (e.g. dayNightPalette) for runtime overrides.</li>
          <li>Export the active selection to test the `.love.json` pathway.</li>
        </ol>
      </section>
    </div>
  )
}
