import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { HotkeysPanel } from '../HotkeysPanel'

describe('HotkeysPanel', () => {
  it('lists the known hotkey sections', () => {
    render(<HotkeysPanel />)

    expect(
      screen.getByRole('heading', { name: /cursor modes/i, level: 3 }),
    ).toBeInTheDocument()
    expect(screen.getByText(/increase glyph size/i)).toBeInTheDocument()
    expect(screen.getByText(/toggle grid overlay/i)).toBeInTheDocument()
    expect(screen.getByText(/nudge selection by 2px/i)).toBeInTheDocument()
  })
})
