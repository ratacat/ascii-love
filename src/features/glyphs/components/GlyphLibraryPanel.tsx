import './GlyphLibraryPanel.css'

import { useState } from 'react'

import { useEditorStore } from '@shared/state/editorStore'
import { GLYPH_SHEETS } from '@shared/constants/glyphSheets'
import type { GlyphSheet } from '@shared/constants/glyphSheets'

export function GlyphLibraryPanel() {
  const [activeSheet, setActiveSheet] = useState<GlyphSheet>(GLYPH_SHEETS[0])
  const activeGlyphChar = useEditorStore((state) => state.activeGlyphChar)
  const setActiveGlyph = useEditorStore((state) => state.setActiveGlyph)
  const setCursorMode = useEditorStore((state) => state.setCursorMode)

  return (
    <div className="glyph-library">
      <div className="glyph-library__tabs" role="tablist" aria-label="Glyph sheets">
        {GLYPH_SHEETS.map((sheet) => {
          const isActive = sheet.id === activeSheet.id
          return (
            <button
              key={sheet.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={['glyph-library__tab', isActive && 'glyph-library__tab--active']
                .filter(Boolean)
                .join(' ')}
              onClick={() => setActiveSheet(sheet)}
            >
              {sheet.label}
            </button>
          )
        })}
      </div>
      <p className="glyph-library__description">{activeSheet.description}</p>
      <div className="glyph-library__grid" role="list">
        {activeSheet.glyphs.map((glyph, index) => (
          <button
            key={`${glyph}-${index}`}
            type="button"
            className="glyph-library__cell"
            aria-label={`Queue glyph ${glyph}`}
            aria-pressed={glyph === activeGlyphChar}
            data-active={glyph === activeGlyphChar || undefined}
            onClick={() => {
              setActiveGlyph(glyph)
              setCursorMode('place')
            }}
          >
            {glyph}
          </button>
        ))}
      </div>
      <footer className="glyph-library__footer">
        <p>
          Custom sheets will live in your workspace directory. The MVP stores sheets locally with TOML
          metadata for quick editing.
        </p>
      </footer>
    </div>
  )
}
