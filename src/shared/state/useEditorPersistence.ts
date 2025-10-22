import { useEffect, useRef } from 'react'

import { useEditorStore } from './editorStore'
import { loadPersistedEditorState, persistEditorState } from './persistence'

export function useEditorPersistence() {
  const layout = useEditorStore((state) => state.layout)
  const preferences = useEditorStore((state) => state.preferences)
  const palettes = useEditorStore((state) => state.document.palettes)
  const loadLayout = useEditorStore((state) => state.loadLayoutFromPersistence)
  const setPreferences = useEditorStore((state) => state.setPreferences)
  const loadPalettes = useEditorStore((state) => state.loadPalettesFromPersistence)

  const hasHydrated = useRef(false)
  const readyToPersist = useRef(false)

  useEffect(() => {
    if (hasHydrated.current) {
      return
    }
    hasHydrated.current = true

    const persisted = loadPersistedEditorState()
    if (persisted) {
      loadLayout(persisted.layout)
      setPreferences(persisted.preferences)
      if (persisted.palettes?.length) {
        loadPalettes(persisted.palettes)
      }
    }
    readyToPersist.current = true
  }, [loadLayout, loadPalettes, setPreferences])

  useEffect(() => {
    if (!readyToPersist.current) {
      return
    }
    persistEditorState({ layout, preferences, palettes })
  }, [layout, palettes, preferences])
}
