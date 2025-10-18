import './InspectorPanel.css'

import { useMemo, useState } from 'react'

import { useEditorStore } from '@shared/state/editorStore'

export function InspectorPanel() {
  const document = useEditorStore((state) => state.document)
  const selection = useEditorStore((state) => state.selection)
  const createGroupFromSelection = useEditorStore((state) => state.createGroupFromSelection)
  const updateGroup = useEditorStore((state) => state.updateGroup)
  const deleteGroup = useEditorStore((state) => state.deleteGroup)
  const selectGlyphs = useEditorStore((state) => state.selectGlyphs)
  const setSelection = useEditorStore((state) => state.setSelection)

  const [groupName, setGroupName] = useState('')
  const [groupKey, setGroupKey] = useState('')

  const selectionSummary = selection.glyphIds.length
    ? `${selection.glyphIds.length} glyph${selection.glyphIds.length === 1 ? '' : 's'}`
    : 'No glyphs selected'

  const selectionBounds = selection.bounds
    ? `${selection.bounds.min.x},${selection.bounds.min.y} → ${selection.bounds.max.x},${selection.bounds.max.y}`
    : '—'

  const selectedGroups = useMemo(
    () => document.groups.filter((group) => selection.groupIds.includes(group.id)),
    [document.groups, selection.groupIds],
  )

  const sortedGroups = useMemo(
    () => [...document.groups].sort((a, b) => a.name.localeCompare(b.name)),
    [document.groups],
  )

  const handleCreateGroup = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selection.glyphIds.length || !groupName.trim()) {
      return
    }

    createGroupFromSelection({
      name: groupName.trim(),
      addressableKey: groupKey.trim() || undefined,
    })
    setGroupName('')
    setGroupKey('')
  }

  const handleFocusGroup = (groupId: string) => {
    const group = document.groups.find((item) => item.id === groupId)
    if (!group) {
      return
    }

    selectGlyphs(group.glyphIds)
    setSelection({ groupIds: [groupId] })
  }

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
        <p className="inspector-panel__meta">Bounds: {selectionBounds}</p>
      </section>

      <section>
        <header className="inspector-panel__section-title">Group Selection</header>
        <form className="inspector-panel__group-form" onSubmit={handleCreateGroup}>
          <label className="inspector-panel__field">
            <span>Name</span>
            <input
              type="text"
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="LoreHighlight"
            />
          </label>
          <label className="inspector-panel__field">
            <span>Addressable Key</span>
            <input
              type="text"
              value={groupKey}
              onChange={(event) => setGroupKey(event.target.value)}
              placeholder="dayNightPalette"
            />
          </label>
          <button type="submit" disabled={!selection.glyphIds.length || !groupName.trim()}>
            Tag {selection.glyphIds.length || '0'} glyph(s)
          </button>
        </form>
        {!selection.glyphIds.length ? (
          <p className="inspector-panel__empty">
            Select one or more glyphs to establish an addressable group target.
          </p>
        ) : null}
      </section>

      <section>
        <header className="inspector-panel__section-title">Addressable Groups</header>
        {selectedGroups.length ? (
          <ul className="inspector-panel__list">
            {selectedGroups.map((group) => (
              <li key={group.id}>
                <div className="inspector-panel__group-header">
                  <strong>{group.name}</strong>
                  <span className="inspector-panel__pill">{group.glyphIds.length} glyphs</span>
                </div>
                <label className="inspector-panel__field inspector-panel__field--compact">
                  <span>Key</span>
                  <input
                    type="text"
                    value={group.addressableKey ?? ''}
                    onChange={(event) =>
                      updateGroup(group.id, { addressableKey: event.target.value || undefined })
                    }
                    placeholder="runtimeOverrideKey"
                  />
                </label>
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
        <header className="inspector-panel__section-title">All Groups</header>
        {sortedGroups.length ? (
          <ul className="inspector-panel__list inspector-panel__list--rows">
            {sortedGroups.map((group) => (
              <li key={group.id} className="inspector-panel__group-row">
                <button
                  type="button"
                  className="inspector-panel__group-focus"
                  onClick={() => handleFocusGroup(group.id)}
                >
                  <span className="inspector-panel__group-name">{group.name}</span>
                  <span className="inspector-panel__group-meta">{group.glyphIds.length} glyphs</span>
                </button>
                <div className="inspector-panel__group-controls">
                  <input
                    className="inspector-panel__group-key"
                    type="text"
                    value={group.addressableKey ?? ''}
                    onChange={(event) =>
                      updateGroup(group.id, { addressableKey: event.target.value || undefined })
                    }
                    placeholder="addressableKey"
                  />
                  <button
                    type="button"
                    className="inspector-panel__group-delete"
                    onClick={() => deleteGroup(group.id)}
                    aria-label={`Delete group ${group.name}`}
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="inspector-panel__empty">
            Groups organize selections for animation previews and runtime theming hooks.
          </p>
        )}
      </section>
    </div>
  )
}
