import './PanelChrome.css'

import type { MouseEvent, PropsWithChildren, ReactNode } from 'react'

import { useEditorStore } from '@shared/state/editorStore'
import type { PanelId } from '@shared/types/editor'

interface PanelChromeProps extends PropsWithChildren {
  id: PanelId
  title: string
  actions?: ReactNode
}

export function PanelChrome({ id, title, actions, children }: PanelChromeProps) {
  const panelState = useEditorStore((state) => state.layout.panels[id])
  const togglePanelCollapsed = useEditorStore((state) => state.togglePanelCollapsed)

  if (!panelState?.visible) {
    return null
  }

  const collapsed = panelState?.collapsed ?? false
  const bodyId = `${id}-panel-body`

  const handleToggle = (event: MouseEvent<HTMLButtonElement>) => {
    togglePanelCollapsed(id)
    event.currentTarget.blur()
  }

  return (
    <section
      className="panel"
      data-panel-id={id}
      data-collapsed={collapsed || undefined}
      aria-labelledby={`${id}-panel-title`}
    >
      <header className="panel__header">
        <h2 id={`${id}-panel-title`} className="panel__title">
          <button
            type="button"
            className="panel__title-button"
            aria-expanded={!collapsed}
            aria-controls={bodyId}
            onClick={handleToggle}
          >
            <span className="panel__title-text">{title}</span>
            <span className="panel__title-indicator" aria-hidden />
          </button>
        </h2>
        {actions ? <div className="panel__actions">{actions}</div> : null}
      </header>
      <div id={bodyId} className="panel__body" hidden={collapsed} aria-hidden={collapsed}>
        {children}
      </div>
    </section>
  )
}
