import { CP437_PRINTABLE } from './cp437'

export interface GlyphSheet {
  id: string
  label: string
  description: string
  glyphs: string[]
}

export const GLYPH_SHEETS: GlyphSheet[] = [
  {
    id: 'cp437-full',
    label: 'CP437',
    description: `Complete Code Page 437 set (${CP437_PRINTABLE.length} glyphs) captured from the scan reference.`,
    glyphs: [...CP437_PRINTABLE],
  },
]
