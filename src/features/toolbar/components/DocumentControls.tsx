import { useEffect, useMemo, useRef, useState } from 'react'

import {
  flushPendingAutosave,
  requestManualCanvasSave,
} from '@shared/state/useEditorPersistence'
import {
  type CanvasLibraryEntry,
  useEditorStore,
} from '@shared/state/editorStore'

const formatUpdatedAt = (value?: string): string => {
  if (!value) {
    return ''
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

const nameOrFallback = (entry: { name?: string }): string =>
  entry.name?.trim() || 'Untitled Canvas'

export function DocumentControls() {
  const documentName = useEditorStore((state) => state.document.name)
  const canvasLibrary = useEditorStore((state) => state.canvasLibrary)
  const activeCanvasId = useEditorStore((state) => state.activeCanvasId)
  const hasUnsavedChanges = useEditorStore((state) => state.hasUnsavedChanges)
  const autosaveState = useEditorStore((state) => state.autosaveState)
  const setDocumentName = useEditorStore((state) => state.setDocumentName)
  const selectCanvas = useEditorStore((state) => state.selectCanvas)
  const deleteCanvas = useEditorStore((state) => state.deleteCanvas)
  const createCanvas = useEditorStore((state) => state.createCanvas)

  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isSelectorOpen, setIsSelectorOpen] = useState(false)
  const [draftTitle, setDraftTitle] = useState(documentName ?? '')

  const titleInputRef = useRef<HTMLInputElement | null>(null)
  const selectorRef = useRef<HTMLDivElement | null>(null)
  const originalTitleRef = useRef<string>(documentName ?? '')

  useEffect(() => {
    if (!isEditingTitle) {
      setDraftTitle(documentName ?? '')
    }
  }, [documentName, isEditingTitle])

  useEffect(() => {
    if (!isSelectorOpen) {
      return
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (!selectorRef.current) {
        return
      }
      if (!selectorRef.current.contains(event.target as Node)) {
        setIsSelectorOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSelectorOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isSelectorOpen])

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

  const saveButtonLabel = useMemo(() => {
    switch (autosaveState.status) {
      case 'saving':
        return 'Saving…'
      case 'saved':
        return 'Saved'
      case 'error':
        return 'Save failed'
      default:
        return hasUnsavedChanges ? 'Save changes' : 'Save'
    }
  }, [autosaveState.status, hasUnsavedChanges])

  const beginEditingTitle = () => {
    originalTitleRef.current = documentName ?? ''
    setIsEditingTitle(true)
  }

  const commitTitle = () => {
    setIsEditingTitle(false)
    if (!draftTitle.trim()) {
      setDocumentName('')
    }
  }

  const cancelTitleEditing = () => {
    setIsEditingTitle(false)
    setDraftTitle(originalTitleRef.current)
    setDocumentName(originalTitleRef.current)
  }

  const handleTitleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const next = event.target.value
    setDraftTitle(next)
    setDocumentName(next)
  }

  const handleTitleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitTitle()
      requestManualCanvasSave()
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      cancelTitleEditing()
    }
  }

  const handleTitleBlur: React.FocusEventHandler<HTMLInputElement> = () => {
    if (isEditingTitle) {
      commitTitle()
    }
  }

  const handleSaveClick = () => {
    if (!isEditingTitle) {
      beginEditingTitle()
    } else if (titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
    requestManualCanvasSave()
  }

  const handleSelectCanvas = (entry: CanvasLibraryEntry) => {
    if (entry.id === activeCanvasId) {
      setIsSelectorOpen(false)
      return
    }
    flushPendingAutosave()
    selectCanvas(entry.id)
    setIsSelectorOpen(false)
    setIsEditingTitle(false)
  }

  const handleDeleteCanvas = (entry: CanvasLibraryEntry) => {
    const message = `Delete "${nameOrFallback(entry)}"?`
    if (!window.confirm(message)) {
      return
    }
    if (entry.id === activeCanvasId) {
      flushPendingAutosave()
    }
    deleteCanvas(entry.id)
    setIsSelectorOpen(false)
  }

  const handleCreateCanvas = () => {
    flushPendingAutosave()
    const entry = createCanvas()
    setIsSelectorOpen(false)
    originalTitleRef.current = entry.name
    setIsEditingTitle(true)
    setDraftTitle(entry.name)
  }

  return (
    <div className="toolbar__document">
      <div className="toolbar__title">
        {isEditingTitle ? (
          <input
            ref={titleInputRef}
            className="toolbar__title-input"
            value={draftTitle}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            aria-label="Canvas title"
            placeholder="Untitled Canvas"
          />
        ) : (
          <button
            type="button"
            className="toolbar__title-button"
            onClick={beginEditingTitle}
            title="Rename canvas"
          >
            {nameOrFallback({ name: documentName })}
          </button>
        )}
      </div>
      <button type="button" className="toolbar__button toolbar__save-button" onClick={handleSaveClick} aria-live="polite">
        {saveButtonLabel}
      </button>
      <div className="toolbar__canvas-selector" ref={selectorRef}>
        <button
          type="button"
          className="toolbar__selector-toggle"
          aria-haspopup="true"
          aria-expanded={isSelectorOpen}
          onClick={() => setIsSelectorOpen((current) => !current)}
        >
          Canvases
          <span className="toolbar__selector-chevron" aria-hidden>
            ▾
          </span>
        </button>
        {isSelectorOpen && (
          <div className="toolbar__selector-popover" role="menu">
            <div className="toolbar__selector-header">Saved canvases</div>
            <ul className="toolbar__selector-list">
              {canvasLibrary.map((entry) => {
                const isActive = entry.id === activeCanvasId
                const updatedLabel = formatUpdatedAt(entry.updatedAt)
                return (
                  <li key={entry.id} className={isActive ? 'toolbar__selector-item toolbar__selector-item--active' : 'toolbar__selector-item'}>
                    <button
                      type="button"
                      className="toolbar__selector-option"
                      role="menuitem"
                      onClick={() => handleSelectCanvas(entry)}
                    >
                      <span className="toolbar__selector-name">{nameOrFallback(entry)}</span>
                      {updatedLabel ? (
                        <span className="toolbar__selector-meta">Updated {updatedLabel}</span>
                      ) : null}
                    </button>
                    <button
                      type="button"
                      className="toolbar__selector-delete"
                      onClick={() => handleDeleteCanvas(entry)}
                      aria-label={`Delete ${nameOrFallback(entry)}`}
                    >
                      ×
                    </button>
                  </li>
                )
              })}
            </ul>
            <div className="toolbar__selector-footer">
              <button type="button" className="toolbar__selector-add" onClick={handleCreateCanvas}>
                + New canvas
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
