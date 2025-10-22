import './GroupPanel.css'

import type { KeyboardEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useEditorStore } from '@shared/state/editorStore'
import { slugify } from '@shared/utils/slug'

const MAX_NAME_LENGTH = 48

const formatAddressableKey = (name: string, existingKeys: Set<string>): string => {
  const trimmed = name.trim()
  const baseSlug = slugify(trimmed || 'group', 'group').replace(/-/g, '_')
  if (!existingKeys.has(baseSlug)) {
    return baseSlug
  }

  let suffix = 2
  let candidate = `${baseSlug}_${suffix}`
  while (existingKeys.has(candidate)) {
    suffix += 1
    candidate = `${baseSlug}_${suffix}`
  }

  return candidate
}

export function GroupPanel() {
  const document = useEditorStore((state) => state.document)
  const selection = useEditorStore((state) => state.selection)
  const updateGroup = useEditorStore((state) => state.updateGroup)
  const deleteGroup = useEditorStore((state) => state.deleteGroup)
  const selectGlyphs = useEditorStore((state) => state.selectGlyphs)
  const setSelection = useEditorStore((state) => state.setSelection)

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const previousGroupIdsRef = useRef<string[]>([])
  const hasInitializedRef = useRef(false)
  const [draftNames, setDraftNames] = useState<Record<string, string>>({})
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)

  const sortedGroups = useMemo(
    () => [...document.groups].sort((a, b) => a.name.localeCompare(b.name)),
    [document.groups],
  )

  const selectGroup = useCallback(
    (groupId: string) => {
      const group = document.groups.find((entry) => entry.id === groupId)
      if (!group) {
        return
      }
      selectGlyphs(group.glyphIds)
      setSelection({ groupIds: [groupId] })
    },
    [document.groups, selectGlyphs, setSelection],
  )

  const scheduleFocus = useCallback((groupId: string) => {
    const scheduler =
      typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame
        : (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0)

    scheduler(() => {
      const node = inputRefs.current[groupId]
      if (node) {
        node.focus()
        node.select()
      }
    })
  }, [])

  const computeAddressableKey = useCallback(
    (name: string, groupId: string): string => {
      const existing = new Set(
        document.groups
          .filter((group) => group.id !== groupId)
          .map((group) => group.addressableKey?.toLowerCase())
          .filter((key): key is string => Boolean(key)),
      )
      return formatAddressableKey(name, existing)
    },
    [document.groups],
  )

  const stopEditing = useCallback((groupId: string) => {
    setEditingGroupId((previous) => (previous === groupId ? null : previous))
    setDraftNames((previous) => {
      const next = { ...previous }
      delete next[groupId]
      return next
    })
  }, [])

  const commitGroupName = useCallback(
    (groupId: string, inputValue?: string) => {
      const group = document.groups.find((item) => item.id === groupId)
      if (!group) {
        return
      }

      const currentDraft = inputValue ?? draftNames[groupId] ?? group.name
      const trimmed = currentDraft.trim()
      const finalName = trimmed || group.name

      const addressableKey = computeAddressableKey(finalName, groupId)
      updateGroup(groupId, { name: finalName, addressableKey })
      stopEditing(groupId)
    },
    [computeAddressableKey, document.groups, draftNames, stopEditing, updateGroup],
  )

  const startEditing = useCallback(
    (groupId: string, options?: { select?: boolean }) => {
      const group = document.groups.find((item) => item.id === groupId)
      if (!group) {
        return
      }

      setEditingGroupId(groupId)
      setDraftNames((previous) => ({ ...previous, [groupId]: group.name }))
      if (options?.select) {
        selectGroup(groupId)
      }
      scheduleFocus(groupId)
    },
    [document.groups, scheduleFocus, selectGroup],
  )

  const handleNameChange = useCallback((groupId: string, value: string) => {
    setDraftNames((previous) => ({ ...previous, [groupId]: value }))
  }, [])

  const handleNameKeyDown = useCallback(
    (groupId: string, event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        commitGroupName(groupId, event.currentTarget.value)
        event.currentTarget.blur()
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        const group = document.groups.find((item) => item.id === groupId)
        const fallback = group?.name ?? ''
        setDraftNames((previous) => ({ ...previous, [groupId]: fallback }))
        event.currentTarget.value = fallback
        stopEditing(groupId)
      }
    },
    [commitGroupName, document.groups, stopEditing],
  )

  const handleNameBlur = useCallback(
    (groupId: string, value: string) => {
      commitGroupName(groupId, value)
    },
    [commitGroupName],
  )

  const handleCancelEditing = useCallback(
    (groupId: string) => {
      stopEditing(groupId)
    },
    [stopEditing],
  )

  const handleRowClick = useCallback(
    (groupId: string) => {
      selectGroup(groupId)
    },
    [selectGroup],
  )

  useEffect(() => {
    const previousIds = previousGroupIdsRef.current
    const currentIds = sortedGroups.map((group) => group.id)

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true
      previousGroupIdsRef.current = currentIds
      return
    }

    const newIds = currentIds.filter((id) => !previousIds.includes(id))

    if (newIds.length === 1) {
      startEditing(newIds[0], { select: true })
    }

    previousGroupIdsRef.current = currentIds
  }, [sortedGroups, startEditing])

  useEffect(() => {
    setDraftNames((previous) => {
      const allowed = new Set(sortedGroups.map((group) => group.id))
      const nextEntries = Object.entries(previous).filter(([id]) => allowed.has(id))
      if (nextEntries.length === Object.keys(previous).length) {
        return previous
      }
      return Object.fromEntries(nextEntries)
    })
  }, [sortedGroups])

  useEffect(() => {
    if (!editingGroupId) {
      return
    }
    const stillExists = document.groups.some((group) => group.id === editingGroupId)
    if (!stillExists) {
      setEditingGroupId(null)
    }
  }, [document.groups, editingGroupId])

  return (
    <div className="group-panel">
      <section className="group-panel__section">
        <header className="group-panel__section-title">Existing Groups</header>
        {sortedGroups.length ? (
          <ul className="group-panel__list">
            {sortedGroups.map((group) => {
              const isActive = selection.groupIds.includes(group.id)
              const isEditing = editingGroupId === group.id
              const displayName = draftNames[group.id] ?? group.name

              return (
                <li
                  key={group.id}
                  className={`group-panel__item${isActive ? ' group-panel__item--active' : ''}`}
                  onClick={() => handleRowClick(group.id)}
                >
                  {isEditing ? (
                    <input
                      ref={(node) => {
                        if (node) {
                          inputRefs.current[group.id] = node
                        } else {
                          delete inputRefs.current[group.id]
                        }
                      }}
                      className="group-panel__item-input"
                      type="text"
                      value={displayName}
                      maxLength={MAX_NAME_LENGTH}
                      onChange={(event) => handleNameChange(group.id, event.target.value)}
                      onKeyDown={(event) => handleNameKeyDown(group.id, event)}
                      onBlur={(event) => handleNameBlur(group.id, event.target.value)}
                    />
                  ) : (
                    <span className="group-panel__item-label">{group.name}</span>
                  )}

                  <div className="group-panel__item-actions">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          className="group-panel__item-action group-panel__item-action--primary"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={(event) => {
                            event.stopPropagation()
                            commitGroupName(group.id, displayName)
                          }}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="group-panel__item-action"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={(event) => {
                            event.stopPropagation()
                            handleCancelEditing(group.id)
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="group-panel__item-action"
                        onClick={(event) => {
                          event.stopPropagation()
                          startEditing(group.id, { select: true })
                        }}
                      >
                        Edit
                      </button>
                    )}
                    <button
                      type="button"
                      className="group-panel__item-action group-panel__item-action--danger"
                      onClick={(event) => {
                        event.stopPropagation()
                        deleteGroup(group.id)
                      }}
                      aria-label={`Delete group ${group.name}`}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="group-panel__empty">Use Cmd/Ctrl + G to group your selection.</p>
        )}
      </section>
    </div>
  )
}
