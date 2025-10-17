import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { useEditorStore } from '@shared/state/editorStore'

import { Toolbar } from './Toolbar'

beforeEach(() => {
  useEditorStore.getState().resetDocument()
})

describe('Toolbar', () => {
  it('switches cursor mode when selecting a tool', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)

    const placeButton = screen.getByRole('button', { name: /Place/i })
    expect(useEditorStore.getState().cursor.mode).toBe('select')

    await user.click(placeButton)

    expect(useEditorStore.getState().cursor.mode).toBe('place')
    expect(placeButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('toggles grid visibility via toolbar controls', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)

    const gridToggle = screen.getByLabelText(/Grid/i)
    expect(useEditorStore.getState().preferences.showGrid).toBe(false)

    await user.click(gridToggle)

    expect(useEditorStore.getState().preferences.showGrid).toBe(true)
  })
})
