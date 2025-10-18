export interface GlyphSheet {
  id: string
  label: string
  description: string
  glyphs: string[]
}

const LETTERS_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const LETTERS_LOWER = 'abcdefghijklmnopqrstuvwxyz'.split('')
const DIGITS_AND_PUNCTUATION = '0123456789!?@#$%^&*()[]{}<>+-=~'.split('')

export const GLYPH_SHEETS: GlyphSheet[] = [
  {
    id: 'mono-upper',
    label: 'Latin Upper',
    description: 'Uppercase Latin set for headings and strong labels.',
    glyphs: LETTERS_UPPER,
  },
  {
    id: 'mono-lower',
    label: 'Latin Lower',
    description: 'Lowercase Latin letters for body text accents.',
    glyphs: LETTERS_LOWER,
  },
  {
    id: 'digits-symbols',
    label: 'Digits & Symbols',
    description: 'Numerals and common punctuation for HUD and UI work.',
    glyphs: DIGITS_AND_PUNCTUATION,
  },
  {
    id: 'shading',
    label: 'Shading',
    description: 'Block and shading glyphs for fills and volume.',
    glyphs: ['█', '▓', '▒', '░', '▀', '▄', '▌', '▐', '▖', '▗', '▘', '▙', '▚', '▛', '▜', '▝', '▞', '▟'],
  },
  {
    id: 'boxdrawing',
    label: 'Box Drawing',
    description: 'Precise line work for frames, panels, and dividers.',
    glyphs: ['─', '━', '│', '┃', '┌', '┐', '└', '┘', '├', '┤', '┬', '┴', '┼', '╭', '╮', '╯', '╰', '╱', '╲', '╳'],
  },
  {
    id: 'arrows',
    label: 'Arrows',
    description: 'Directional arrows for flow diagrams and UI cues.',
    glyphs: ['↑', '↓', '←', '→', '↕', '↔', '↖', '↗', '↘', '↙', '⇑', '⇓', '⇐', '⇒', '⇔'],
  },
  {
    id: 'symbols',
    label: 'Symbols',
    description: 'Stars, suns, and ornamentation for decorative moments.',
    glyphs: ['★', '☆', '✦', '✧', '✶', '✷', '✺', '✹', '❂', '❖', '☼', '☾', '☽', '♠', '♥', '♦', '♣'],
  },
]
