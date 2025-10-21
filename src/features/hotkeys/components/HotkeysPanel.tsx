import './HotkeysPanel.css'

import { HOTKEY_SECTIONS } from '@shared/constants/hotkeys'

export function HotkeysPanel() {
  return (
    <div className="hotkeys-panel" role="region" aria-label="Keyboard shortcuts">
      {HOTKEY_SECTIONS.map((section) => (
        <section key={section.title} className="hotkeys-panel__section">
          <h3 className="hotkeys-panel__heading">{section.title}</h3>
          <ul className="hotkeys-panel__list">
            {section.entries.map((entry, index) => (
              <li key={`${section.title}-${index}`} className="hotkeys-panel__item">
                <div className="hotkeys-panel__keys" aria-hidden>
                  {entry.keys.map((label) => (
                    <kbd key={label} className="hotkeys-panel__key">
                      {label}
                    </kbd>
                  ))}
                </div>
                <p className="hotkeys-panel__description">{entry.description}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
