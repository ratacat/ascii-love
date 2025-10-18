import { useEffect, useRef } from 'react'

import { useEditorStore } from './editorStore'
import { loadPersistedEditorState, persistEditorState } from './persistence'

export function useEditorPersistence() {
  const layout = useEditorStore((state) => state.layout)
  const preferences = useEditorStore((state) => state.preferences)
  const loadLayout = useEditorStore((state) => state.loadLayoutFromPersistence)
  const setPreferences = useEditorStore((state) => state.setPreferences)

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
    }
    readyToPersist.current = true
  }, [loadLayout, setPreferences])

  useEffect(() => {
    if (!readyToPersist.current) {
      return
    }
    persistEditorState({ layout, preferences })
  }, [layout, preferences])
}
