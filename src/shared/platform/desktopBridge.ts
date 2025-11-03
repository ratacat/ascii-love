export type ExportSavePayload = {
  defaultPath?: string
  filters?: Array<{ name: string; extensions: string[] }>
  content: string
  encoding?: 'utf8' | 'utf-8'
}

export type ExportSaveResult = {
  canceled: boolean
  filePath?: string
}

type PersistenceUnsupportedResult = {
  supported: false
}

type PersistenceSupportedResult<T> = {
  supported: true
  value: T
}

export type PersistenceSaveResult = PersistenceUnsupportedResult | PersistenceSupportedResult<void>

export interface DesktopBridge {
  platform: 'desktop'
  exports: {
    save: (payload: ExportSavePayload) => Promise<ExportSaveResult>
  }
  persistence: {
    loadCanvasLibrary: () => Promise<unknown | null>
    saveCanvasLibrary: (payload: unknown) => Promise<PersistenceSaveResult>
    loadEditorState: () => Promise<unknown | null>
    saveEditorState: (payload: unknown) => Promise<PersistenceSaveResult>
  }
}

declare global {
  interface Window {
    asciiloveDesktop?: DesktopBridge
  }
}

export const isDesktopEnvironment = (): boolean =>
  typeof window !== 'undefined' && typeof window.asciiloveDesktop !== 'undefined'

export const getDesktopBridge = (): DesktopBridge | null =>
  isDesktopEnvironment() ? window.asciiloveDesktop ?? null : null

