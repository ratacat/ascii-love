import './GlyphLibraryPanel.css'

import { useState } from 'react'

interface GlyphSheet {
  id: string
  label: string
  description: string
  glyphs: string[]
}

const GLYPH_SHEETS: GlyphSheet[] = [
  {
    id: 'cp437',
    label: 'CP-437 Core',
    description: 'Classic DOS legacy set with heavy block and line glyphs.',
    glyphs: ['█', '▓', '▒', '░', '╬', '╪', '╓', '╖', '╫', '╫', '╬', '║', '═', '╬', '╔', '╗', '╚', '╝'],
  },
  {
    id: 'boxdrawing',
    label: 'Box Drawing',
    description: 'Precise UI structural glyphs for frames, dividers and callouts.',
    glyphs: ['─', '━', '│', '┃', '┌', '┐', '└', '┘', '├', '┤', '┬', '┴', '┼', '╱', '╲', '╳', '╭', '╮', '╯', '╰'],
  },
  {
    id: 'ornate',
    label: 'Ornate',
    description: 'Accents suited for illuminated manuscript motifs.',
    glyphs: ['✶', '✷', '✺', '✹', '✴', '❋', '❉', '❖', '❂', '✢', '✣', '✥', '✦', '✧', '☆', '★', '☼', '☾', '☽'],
  },
]

export function GlyphLibraryPanel() {
  const [activeSheet, setActiveSheet] = useState<GlyphSheet>(GLYPH_SHEETS[0])

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
