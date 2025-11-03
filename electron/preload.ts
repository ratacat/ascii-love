import { contextBridge, ipcRenderer } from 'electron'
import type { DesktopBridge, ExportSaveResult, ExportSavePayload } from '../src/shared/platform/desktopBridge'

const bridge: DesktopBridge = {
  platform: 'desktop',
  exports: {
    async save(payload: ExportSavePayload): Promise<ExportSaveResult> {
      return (await ipcRenderer.invoke('desktop:export:save', payload)) as ExportSaveResult
    },
  },
  persistence: {
    async loadCanvasLibrary() {
      return null
    },
    async saveCanvasLibrary() {
      return { supported: false }
    },
    async loadEditorState() {
      return null
    },
    async saveEditorState() {
      return { supported: false }
    },
  },
}

contextBridge.exposeInMainWorld('asciiloveDesktop', bridge)

