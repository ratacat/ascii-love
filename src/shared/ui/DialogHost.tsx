import './DialogHost.css'

import { createPortal } from 'react-dom'
import { useEffect, useId, useRef, useState } from 'react'

import {
  cancelActiveDialog,
  confirmActiveDialog,
  dismissActiveDialog,
  useActiveDialog,
} from '@shared/state/dialogStore'

export function DialogHost() {
  const descriptor = useActiveDialog()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [promptValue, setPromptValue] = useState('')
  const dialogTitleId = useId()

  useEffect(() => {
    if (!descriptor) {
      setPromptValue('')
      return
    }

    if (descriptor.kind === 'prompt') {
      setPromptValue(descriptor.defaultValue ?? '')
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    } else {
      requestAnimationFrame(() => {
        inputRef.current?.blur()
      })
    }
  }, [descriptor])

  useEffect(() => {
    if (!descriptor) {
      return
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        cancelActiveDialog()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [descriptor])

  if (!descriptor) {
    return null
  }

  const handleBackdropMouseDown: React.MouseEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault()
    dismissActiveDialog()
  }

  const handleDialogMouseDown: React.MouseEventHandler<HTMLDivElement> = (event) => {
    event.stopPropagation()
  }

  const handleSubmit: React.FormEventHandler = (event) => {
    event.preventDefault()
    if (descriptor.kind === 'prompt') {
      confirmActiveDialog(promptValue)
    } else {
      confirmActiveDialog()
    }
  }

  const handleCancelClick = () => {
    cancelActiveDialog()
  }

  const content = (
    <div className="dialog-host__backdrop" onMouseDown={handleBackdropMouseDown}>
      <div
        className="dialog-host__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={descriptor.title ? dialogTitleId : undefined}
        onMouseDown={handleDialogMouseDown}
      >
        <form className="dialog-host__form" onSubmit={handleSubmit}>
          {descriptor.title ? (
            <h2 className="dialog-host__title" id={dialogTitleId}>
              {descriptor.title}
            </h2>
          ) : null}
          <p className="dialog-host__message">{descriptor.message}</p>
          {descriptor.kind === 'prompt' ? (
            <input
              ref={inputRef}
              className="dialog-host__input"
              value={promptValue}
              onChange={(event) => setPromptValue(event.target.value)}
              placeholder={descriptor.placeholder}
              aria-label={descriptor.title ?? 'Input'}
            />
          ) : null}
          <div className="dialog-host__actions">
            <button type="button" className="dialog-host__button dialog-host__button--secondary" onClick={handleCancelClick}>
              {descriptor.cancelLabel ?? 'Cancel'}
            </button>
            <button type="submit" className="dialog-host__button dialog-host__button--primary">
              {descriptor.kind === 'prompt'
                ? descriptor.confirmLabel ?? 'Save'
                : descriptor.confirmLabel ?? 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
