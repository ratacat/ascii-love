import './App.css'

import { CanvasViewport } from '@features/canvas/components/CanvasViewport'
import { GlyphLibraryPanel } from '@features/glyphs/components/GlyphLibraryPanel'
import { InspectorPanel } from '@features/inspector/components/InspectorPanel'
import { LayersPanel } from '@features/layers/components/LayersPanel'
import { PalettePanel } from '@features/palette/components/PalettePanel'
import { StatusBar } from '@features/status-bar/components/StatusBar'
import { Toolbar } from '@features/toolbar/components/Toolbar'
import { PanelChrome } from '@shared/ui/PanelChrome'
import { useEditorHotkeys } from '@shared/state/useEditorHotkeys'
import { useEditorPersistence } from '@shared/state/useEditorPersistence'
import { useEditorStore } from '@shared/state/editorStore'

export function App() {
  useEditorHotkeys()
  useEditorPersistence()
  const activeLayoutPreset = useEditorStore((state) => state.layout.activePreset)

  return (
    <div className="app-shell">
      <Toolbar />
      <div className="workspace-grid" data-layout={activeLayoutPreset}>
        <aside className="side-panel side-panel--left">
          <PanelChrome id="layers" title="Layers">
            <LayersPanel />
          </PanelChrome>
          <PanelChrome id="glyphLibrary" title="Glyph Library">
            <GlyphLibraryPanel />
          </PanelChrome>
        </aside>
        <main className="canvas-stage">
          <CanvasViewport />
        </main>
        <aside className="side-panel side-panel--right">
          <PanelChrome id="inspector" title="Inspector">
            <InspectorPanel />
          </PanelChrome>
          <PanelChrome id="palette" title="Palette Manager">
            <PalettePanel />
          </PanelChrome>
        </aside>
      </div>
      <StatusBar />
    </div>
  )
}

export default App
