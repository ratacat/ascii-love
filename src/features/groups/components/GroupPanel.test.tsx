import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { GroupPanel } from './GroupPanel'
import { useEditorStore } from '@shared/state/editorStore'
import { useEditorHotkeys } from '@shared/state/useEditorHotkeys'

function GroupPanelHarness() {
  useEditorHotkeys()
  return <GroupPanel />
}

describe('GroupPanel', () => {
  beforeEach(() => {
    useEditorStore.getState().resetDocument()
  })

  it('creates and focuses a new group when Cmd/Ctrl + G is pressed', async () => {
    render(<GroupPanelHarness />)

    const store = useEditorStore.getState()
    act(() => {
      store.placeGlyph({ x: 0, y: 0 })
    })
    const glyph = useEditorStore.getState().document.layers[0]?.glyphs.at(-1)
    if (!glyph) {
      throw new Error('Glyph not created')
    }
    act(() => {
      store.selectGlyphs([glyph.id])
    })

    act(() => {
      fireEvent.keyDown(window, { key: 'g', code: 'KeyG', metaKey: true })
    })

    const input = await screen.findByDisplayValue('Group 1')
    await waitFor(() => expect(input).toHaveFocus())
  })

  it('shows the simplified empty state when no groups exist', () => {
    render(<GroupPanelHarness />)
    expect(screen.getByText('Use Cmd/Ctrl + G to group your selection.')).toBeInTheDocument()
  })

  it('keeps focus while typing and commits on blur', async () => {
    render(<GroupPanelHarness />)

    const store = useEditorStore.getState()
    act(() => {
      store.placeGlyph({ x: 0, y: 0 })
    })
    const glyph = useEditorStore.getState().document.layers[0]?.glyphs.at(-1)
    if (!glyph) {
      throw new Error('Glyph not created')
    }
    act(() => {
      store.selectGlyphs([glyph.id])
      store.createGroupFromSelection()
    })

    const input = await screen.findByDisplayValue('Group 1')
    const user = userEvent.setup()
    await user.clear(input)
    await user.type(input, 'Hero')

    expect(input).toHaveValue('Hero')
    expect(input).toHaveFocus()

    act(() => {
      input.blur()
    })

    await waitFor(() => {
      const group = useEditorStore.getState().document.groups[0]
      expect(group?.name).toBe('Hero')
    })

    expect(screen.queryByDisplayValue('Hero')).not.toBeInTheDocument()
    expect(screen.getByText('Hero')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
  })

  it('commits the renamed value on Enter', async () => {
    render(<GroupPanelHarness />)

    const store = useEditorStore.getState()
    act(() => {
      store.placeGlyph({ x: 0, y: 0 })
    })
    const glyph = useEditorStore.getState().document.layers[0]?.glyphs.at(-1)
    if (!glyph) {
      throw new Error('Glyph not created')
    }
    act(() => {
      store.selectGlyphs([glyph.id])
      store.createGroupFromSelection()
    })

    const input = await screen.findByDisplayValue('Group 1')
    const user = userEvent.setup()
    await user.clear(input)
    await user.type(input, 'Scene{Enter}')

    await waitFor(() => {
      const group = useEditorStore.getState().document.groups[0]
      expect(group?.name).toBe('Scene')
    })

    expect(screen.queryByDisplayValue('Scene')).not.toBeInTheDocument()
    expect(screen.getByText('Scene')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
  })

  it('saves changes with the Save button and exits editing mode', async () => {
    render(<GroupPanelHarness />)

    const store = useEditorStore.getState()
    act(() => {
      store.placeGlyph({ x: 0, y: 0 })
    })
    const glyph = useEditorStore.getState().document.layers[0]?.glyphs.at(-1)
    if (!glyph) {
      throw new Error('Glyph not created')
    }
    act(() => {
      store.selectGlyphs([glyph.id])
      store.createGroupFromSelection()
    })

    const input = await screen.findByDisplayValue('Group 1')
    const user = userEvent.setup()
    await user.clear(input)
    await user.type(input, 'Title')

    const saveButton = screen.getByRole('button', { name: /save/i })
    await user.click(saveButton)

    await waitFor(() => {
      const group = useEditorStore.getState().document.groups[0]
      expect(group?.name).toBe('Title')
    })
    expect(screen.queryByDisplayValue('Title')).not.toBeInTheDocument()
    expect(screen.getByText('Title')).toBeInTheDocument()
  })

  it('cancels editing and restores the previous name', async () => {
    render(<GroupPanelHarness />)

    const store = useEditorStore.getState()
    act(() => {
      store.placeGlyph({ x: 0, y: 0 })
    })
    const glyph = useEditorStore.getState().document.layers[0]?.glyphs.at(-1)
    if (!glyph) {
      throw new Error('Glyph not created')
    }
    act(() => {
      store.selectGlyphs([glyph.id])
      store.createGroupFromSelection()
    })

    const input = await screen.findByDisplayValue('Group 1')
    const user = userEvent.setup()
    await user.type(input, 'Hero')

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    await waitFor(() => {
      const group = useEditorStore.getState().document.groups[0]
      expect(group?.name).toBe('Group 1')
    })
    expect(screen.queryByDisplayValue(/Group 1/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
  })
})
