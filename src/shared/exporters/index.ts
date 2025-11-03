import type { ExportContext, ExportResult, Exporter } from './types'
import { loveJsonExporter } from './loveJson'
import { svgExporter } from './svg'
import { getDesktopBridge } from '@shared/platform/desktopBridge'

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

const deriveExtension = (filename: string): string | null => {
  const segments = filename.split('.').filter(Boolean)
  if (segments.length <= 1) {
    return null
  }
  return segments.pop() ?? null
}

export const triggerDownload = async (result: ExportResult): Promise<boolean> => {
  if (typeof window === 'undefined') {
    return false
  }

  const bridge = getDesktopBridge()
  if (bridge) {
    try {
      const extension = deriveExtension(result.filename)
      const outcome = await bridge.exports.save({
        content: result.content,
        defaultPath: result.filename,
        encoding: 'utf8',
        filters: extension
          ? [
              {
                name: `${extension.toUpperCase()} files`,
                extensions: [extension],
              },
            ]
          : undefined,
      })
      if (!outcome.canceled) {
        return true
      }
    } catch (error) {
      console.error('Desktop export failed, falling back to browser download', error)
    }
  }

  const blob = new Blob([result.content], { type: result.mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = result.filename
  anchor.rel = 'noopener'
  anchor.click()
  URL.revokeObjectURL(url)
  return true
}

export type { ExportContext, ExportResult, ExportScope, Exporter } from './types'
