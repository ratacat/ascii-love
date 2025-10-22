import { useCallback, useEffect, useMemo, useRef } from 'react'

import { useEditorStore } from './editorStore'
import { loadPersistedCanvasLibrary, loadPersistedEditorState, persistEditorState } from './persistence'

const AUTOSAVE_DEBOUNCE_MS = 1500
const MANUAL_SAVE_RESET_MS = 1200
type SaveSource = 'manual' | 'autosave'

let externalSaveHandler: ((source: SaveSource) => void) | null = null

export const requestManualCanvasSave = () => {
  externalSaveHandler?.('manual')
}

export const flushPendingAutosave = () => {
  externalSaveHandler?.('autosave')
}

export function useEditorPersistence() {
  const layout = useEditorStore((state) => state.layout)
  const preferences = useEditorStore((state) => state.preferences)
  const palettes = useEditorStore((state) => state.document.palettes)
  const loadLayout = useEditorStore((state) => state.loadLayoutFromPersistence)
  const setPreferences = useEditorStore((state) => state.setPreferences)
  const loadPalettes = useEditorStore((state) => state.loadPalettesFromPersistence)
  const hydrateCanvasLibrary = useEditorStore((state) => state.hydrateCanvasLibrary)

  const hasHydrated = useRef(false)
  const readyToPersist = useRef(false)
  const autosaveTimerRef = useRef<number | null>(null)
  const manualResetTimerRef = useRef<number | null>(null)
  const lastSavedSignatureRef = useRef<string | null>(null)
  const previousCanvasIdRef = useRef<string | undefined>()

  const palettesSignature = useMemo(
    () =>
      JSON.stringify(
        palettes.map((palette) => ({
          id: palette.id,
          name: palette.name,
          locked: palette.locked,
          mutable: palette.mutable,
          swatches: palette.swatches.map((swatch) => ({
            id: swatch.id,
            name: swatch.name,
            foreground: swatch.foreground,
            background: swatch.background,
            accent: swatch.accent,
            locked: swatch.locked,
          })),
        })),
      ),
    [palettes],
  )

  const clearAutosaveTimer = useCallback(() => {
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = null
    }
  }, [])

  const triggerSave = useCallback(
    (source: 'autosave' | 'manual') => {
      if (!readyToPersist.current) {
        return
      }

      clearAutosaveTimer()

      readyToPersist.current = false
      try {
        const store = useEditorStore.getState()
        store.setAutosaveState({ status: 'saving', lastSaveSource: source })
        const savedEntry = store.persistActiveCanvas({ source })
        if (!savedEntry) {
          return
        }

        lastSavedSignatureRef.current = JSON.stringify(savedEntry.document)

        if (source === 'manual') {
          if (manualResetTimerRef.current !== null) {
            window.clearTimeout(manualResetTimerRef.current)
          }
          manualResetTimerRef.current = window.setTimeout(() => {
            const nextState = useEditorStore.getState()
            if (!nextState.hasUnsavedChanges) {
              nextState.setAutosaveState({ status: 'idle', lastSaveSource: 'manual' })
            }
          }, MANUAL_SAVE_RESET_MS)
        }
      } finally {
        readyToPersist.current = true
      }
    },
    [clearAutosaveTimer],
  )

  const scheduleAutosave = useCallback(() => {
    clearAutosaveTimer()
    autosaveTimerRef.current = window.setTimeout(() => {
      triggerSave('autosave')
    }, AUTOSAVE_DEBOUNCE_MS)
  }, [clearAutosaveTimer, triggerSave])

  useEffect(() => {
    externalSaveHandler = triggerSave
    return () => {
      if (externalSaveHandler === triggerSave) {
        externalSaveHandler = null
      }
    }
  }, [triggerSave])

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

    const persistedCanvases = loadPersistedCanvasLibrary()
    if (persistedCanvases && persistedCanvases.canvases.length) {
      hydrateCanvasLibrary({
        entries: persistedCanvases.canvases,
        activeCanvasId: persistedCanvases.activeCanvasId ?? persistedCanvases.canvases[0].id,
      })
      const activeId =
        persistedCanvases.activeCanvasId ?? persistedCanvases.canvases[0]?.id ?? undefined
      const activeEntry = persistedCanvases.canvases.find((entry) => entry.id === activeId)
      if (activeEntry) {
        lastSavedSignatureRef.current = JSON.stringify(activeEntry.document)
      }
    } else {
      const state = useEditorStore.getState()
      lastSavedSignatureRef.current = JSON.stringify(state.document)
    }

    previousCanvasIdRef.current = useEditorStore.getState().activeCanvasId ?? undefined
    readyToPersist.current = true
  }, [hydrateCanvasLibrary, loadLayout, loadPalettes, setPreferences])

  useEffect(() => () => {
    clearAutosaveTimer()
    if (manualResetTimerRef.current !== null) {
      window.clearTimeout(manualResetTimerRef.current)
      manualResetTimerRef.current = null
    }
  }, [clearAutosaveTimer])

  useEffect(() => {
    if (!readyToPersist.current) {
      return
    }

    const unsubscribe = useEditorStore.subscribe(
      (state) => state.document,
      (document) => {
        if (!readyToPersist.current) {
          return
        }

        const signature = JSON.stringify(document)
        const store = useEditorStore.getState()

        if (signature === lastSavedSignatureRef.current) {
          if (store.hasUnsavedChanges) {
            store.setHasUnsavedChanges(false)
            store.setAutosaveState({ status: 'idle', lastSaveSource: store.autosaveState.lastSaveSource })
          }
          return
        }

        store.setHasUnsavedChanges(true)
        store.setAutosaveState({ status: 'dirty', lastSaveSource: 'autosave' })
        scheduleAutosave()
      },
    )

    return () => {
      unsubscribe()
    }
  }, [scheduleAutosave])

  const activeCanvasId = useEditorStore((state) => state.activeCanvasId)

  useEffect(() => {
    if (!readyToPersist.current) {
      previousCanvasIdRef.current = activeCanvasId ?? undefined
      return
    }

    clearAutosaveTimer()
    if (manualResetTimerRef.current !== null) {
      window.clearTimeout(manualResetTimerRef.current)
      manualResetTimerRef.current = null
    }

    const store = useEditorStore.getState()
    const entry = store.canvasLibrary.find((item) => item.id === activeCanvasId)
    if (entry) {
      lastSavedSignatureRef.current = JSON.stringify(entry.document)
      if (!store.hasUnsavedChanges) {
        store.setAutosaveState({ status: 'idle', lastSavedAt: entry.updatedAt })
      }
    } else {
      lastSavedSignatureRef.current = JSON.stringify(store.document)
    }

    previousCanvasIdRef.current = activeCanvasId ?? undefined
  }, [activeCanvasId, clearAutosaveTimer])

  useEffect(() => {
    if (!readyToPersist.current) {
      return
    }
    persistEditorState({ layout, preferences, palettes })
  }, [layout, palettes, palettesSignature, preferences])
}
