import { act, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useEditorStore } from './editorStore'
import { requestManualCanvasSave, useEditorPersistence } from './useEditorPersistence'
import * as persistenceModule from './persistence'

function PersistenceHarness() {
  useEditorPersistence()
  return null
}

describe('useEditorPersistence', () => {
  beforeEach(() => {
    useEditorStore.getState().resetDocument()
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('persists palette updates after hydration', async () => {
    vi.spyOn(persistenceModule, 'loadPersistedEditorState').mockReturnValue(null)
    const persistSpy = vi.spyOn(persistenceModule, 'persistEditorState')

    render(<PersistenceHarness />)

    await waitFor(() => {
      expect(persistSpy).toHaveBeenCalled()
    })

    persistSpy.mockClear()

    const store = useEditorStore.getState()
    const palette = store.document.palettes[0]
    if (!palette) {
      throw new Error('Expected default palette to exist')
    }
    const swatch = palette.swatches[0]
    if (!swatch) {
      throw new Error('Expected default swatch to exist')
    }

    act(() => {
      store.updateSwatch(palette.id, swatch.id, { foreground: '#123456' })
    })

    await waitFor(() => {
      expect(persistSpy).toHaveBeenCalled()
    })

    const lastCall = persistSpy.mock.calls.at(-1)
    expect(lastCall).toBeTruthy()
    const payload = lastCall?.[0]
    expect(payload?.palettes?.[0]?.swatches?.[0]?.foreground).toBe('#123456')
  })

  it('supports manual save requests that immediately persist the active canvas', async () => {
    vi.spyOn(persistenceModule, 'loadPersistedEditorState').mockReturnValue(null)

    render(<PersistenceHarness />)

    await waitFor(() => {
      expect(useEditorStore.getState().autosaveState.status).toBe('idle')
    })

    act(() => {
      useEditorStore.getState().setDocumentName('Manual Save Test')
    })

    act(() => {
      requestManualCanvasSave()
    })

    const nextState = useEditorStore.getState()
    expect(nextState.canvasLibrary[0]?.name).toBe('Manual Save Test')
    expect(nextState.hasUnsavedChanges).toBe(false)
  })
})
