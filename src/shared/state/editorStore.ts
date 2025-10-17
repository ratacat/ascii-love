import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import type {
  CursorMode,
  EditorPreferences,
  EditorState,
  LayoutPreset,
  PanelId,
  SelectionState,
} from '@shared/types/editor'
import {
  type CanvasLayer,
  type CanvasDocument,
  type Palette,
} from '@shared/types/editor'

const baseLayer: CanvasLayer = {
  id: 'layer-base',
  name: 'Base Layer',
  glyphs: [],
  visible: true,
  locked: false,
  zIndex: 0,
}

const defaultPalette: Palette = {
  id: 'palette-base',
  name: 'Default Palette',
  locked: false,
  mutable: true,
  description: 'Starter palette seeded with neutral foreground/background pairs.',
  swatches: [
    {
      id: 'swatch-foreground',
      name: 'Primary Foreground',
      foreground: '#F7F7F7',
      background: '#111111',
    },
    {
      id: 'swatch-accent',
      name: 'Accent Highlight',
      foreground: '#FFD166',
      background: '#111111',
    },
    {
      id: 'swatch-shadow',
      name: 'Shadow',
      foreground: '#3A3A3A',
      background: '#111111',
    },
  ],
}

const initialDocument: CanvasDocument = {
  id: 'document-seed',
  name: 'Untitled Canvas',
  width: 80,
  height: 40,
  layers: [baseLayer],
  groups: [],
  palettes: [defaultPalette],
  animationHints: [],
  metadata: {
    version: 1,
    createdAt: new Date().toISOString(),
  },
}

const initialState: EditorState = {
  document: initialDocument,
  cursor: {
    mode: 'select',
    snapped: false,
    gridEnabled: false,
    crosshairEnabled: true,
  },
  selection: {
    glyphIds: [],
    groupIds: [],
    layerIds: [baseLayer.id],
  },
  layout: {
    activePreset: 'classic',
    panels: {
      layers: { id: 'layers', visible: true },
      glyphLibrary: { id: 'glyphLibrary', visible: true },
      inspector: { id: 'inspector', visible: true },
      palette: { id: 'palette', visible: true },
    },
  },
  preferences: {
    showGrid: false,
    showCrosshair: true,
    autoGroupSelection: true,
  },
  activeLayerId: baseLayer.id,
  activePaletteId: defaultPalette.id,
}

export interface EditorStore extends EditorState {
  setCursorMode: (mode: CursorMode) => void
  togglePanelVisibility: (panelId: PanelId) => void
  setLayoutPreset: (preset: LayoutPreset) => void
  setActiveLayer: (layerId: string) => void
  setActivePalette: (paletteId: string) => void
  setPreferences: (preferences: Partial<EditorPreferences>) => void
  selectGlyphs: (selection: SelectionState['glyphIds']) => void
  setSelection: (selection: Partial<SelectionState>) => void
  resetDocument: (document?: CanvasDocument) => void
}

export const useEditorStore = create<EditorStore>()(
  immer((set) => ({
    ...initialState,
    setCursorMode: (mode) =>
      set((draft) => {
        draft.cursor.mode = mode
      }),
    togglePanelVisibility: (panelId) =>
      set((draft) => {
        const panel = draft.layout.panels[panelId]
        if (panel) {
          panel.visible = !panel.visible
        }
      }),
    setLayoutPreset: (preset) =>
      set((draft) => {
        draft.layout.activePreset = preset
      }),
    setActiveLayer: (layerId) =>
      set((draft) => {
        draft.activeLayerId = layerId
        draft.selection.layerIds = [layerId]
      }),
    setActivePalette: (paletteId) =>
      set((draft) => {
        draft.activePaletteId = paletteId
      }),
    setPreferences: (preferences) =>
      set((draft) => {
        draft.preferences = { ...draft.preferences, ...preferences }
        draft.cursor.gridEnabled = draft.preferences.showGrid
        draft.cursor.crosshairEnabled = draft.preferences.showCrosshair
      }),
    selectGlyphs: (glyphIds) =>
      set((draft) => {
        draft.selection.glyphIds = glyphIds
      }),
    setSelection: (selection) =>
      set((draft) => {
        draft.selection = { ...draft.selection, ...selection }
      }),
    resetDocument: (document) =>
      set((draft) => {
        if (document) {
          draft.document = document
          draft.activeLayerId = document.layers[0]?.id
          draft.activePaletteId = document.palettes[0]?.id
          draft.selection = {
            glyphIds: [],
            groupIds: [],
            layerIds: draft.activeLayerId ? [draft.activeLayerId] : [],
          }
        } else {
          draft.document = structuredClone(initialDocument)
          draft.cursor = { ...initialState.cursor }
          draft.selection = { ...initialState.selection }
          draft.layout = structuredClone(initialState.layout)
          draft.preferences = { ...initialState.preferences }
          draft.activeLayerId = initialState.activeLayerId
          draft.activePaletteId = initialState.activePaletteId
        }
      }),
  })),
)

export const getEditorState = (): EditorState => useEditorStore.getState()
