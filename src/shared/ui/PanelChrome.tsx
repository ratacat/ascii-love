import './PanelChrome.css'

import type { PropsWithChildren, ReactNode } from 'react'

import { useEditorStore } from '@shared/state/editorStore'
import type { PanelId } from '@shared/types/editor'

interface PanelChromeProps extends PropsWithChildren {
  id: PanelId
  title: string
  actions?: ReactNode
}

export function PanelChrome({ id, title, actions, children }: PanelChromeProps) {
  const isVisible = useEditorStore((state) => state.layout.panels[id]?.visible)

  if (!isVisible) {
    return null
  }

  return (
    <section className="panel" data-panel-id={id} aria-labelledby={`${id}-panel-title`}>
      <header className="panel__header">
        <h2 id={`${id}-panel-title`} className="panel__title">
          {title}
        </h2>
        {actions ? <div className="panel__actions">{actions}</div> : null}
      </header>
      <div className="panel__body">{children}</div>
    </section>
  )
}
