import type { ExportContext, ExportResult, Exporter } from './types'
import { loveJsonExporter } from './loveJson'
import { svgExporter } from './svg'

export const EXPORTERS: Exporter[] = [loveJsonExporter, svgExporter]

export const getExporter = (id: string): Exporter | undefined =>
  EXPORTERS.find((exporter) => exporter.id === id)

export const runExporter = async (
  id: string,
  context: ExportContext,
): Promise<ExportResult> => {
  const exporter = getExporter(id)
  if (!exporter) {
    throw new Error(`No exporter found for id "${id}"`)
  }

  return await exporter.run(context)
}

export const triggerDownload = (result: ExportResult) => {
  if (typeof window === 'undefined') {
    return
  }

  const blob = new Blob([result.content], { type: result.mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = result.filename
  anchor.rel = 'noopener'
  anchor.click()
  URL.revokeObjectURL(url)
}

export type { ExportContext, ExportResult, ExportScope, Exporter } from './types'
