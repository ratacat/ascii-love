import type { CanvasDocument, SelectionState } from '@shared/types/editor'

export type ExportScope = 'document' | 'selection'

export interface ExportContext {
  document: CanvasDocument
  selection: SelectionState
  scope: ExportScope
  padding: number
  filename?: string
}

export interface ExportResult {
  filename: string
  mimeType: string
  content: string
}

export interface Exporter {
  id: string
  label: string
  description: string
  extension: string
  run: (context: ExportContext) => Promise<ExportResult> | ExportResult
}
