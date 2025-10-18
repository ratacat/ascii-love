import type { Exporter } from './types'
import { buildExportDocument, deriveExportFilename } from './utils'

export const loveJsonExporter: Exporter = {
  id: 'love-json',
  label: '.love.json',
  description: 'Game-native scene graph format with palette and grouping metadata.',
  extension: 'love.json',
  run: ({ document, selection, scope, padding, filename }) => {
    const exportDocument = buildExportDocument({ document, selection, scope, padding })
    const payload = {
      schemaVersion: typeof document.metadata?.schemaVersion === 'number' ? document.metadata.schemaVersion : 1,
      exportedAt: new Date().toISOString(),
      document: exportDocument,
    }

    return {
      filename:
        filename ??
        deriveExportFilename(
          document,
          scope,
          'love.json',
          document.name ?? 'asset',
        ),
      mimeType: 'application/json',
      content: JSON.stringify(payload, null, 2),
    }
  },
}
