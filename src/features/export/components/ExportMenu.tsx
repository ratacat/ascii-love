import './ExportMenu.css'

import { useState } from 'react'

import { EXPORTERS, triggerDownload, runExporter } from '@shared/exporters'
import type { ExportScope } from '@shared/exporters'
import { useEditorStore } from '@shared/state/editorStore'

const DEFAULT_PADDING = 1

export function ExportMenu() {
  const document = useEditorStore((state) => state.document)
  const selection = useEditorStore((state) => state.selection)

  const [open, setOpen] = useState(false)
  const [formatId, setFormatId] = useState<string>(EXPORTERS[0]?.id ?? 'love-json')
  const [scope, setScope] = useState<ExportScope>('document')
  const [padding, setPadding] = useState<number>(DEFAULT_PADDING)
  const [status, setStatus] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const selectedExporter = EXPORTERS.find((exporter) => exporter.id === formatId) ?? EXPORTERS[0]
  const selectionAvailable = selection.glyphIds.length > 0

  const handleExport = async () => {
    if (!selectedExporter) {
      return
    }
    setIsExporting(true)
    setStatus(null)

    try {
      const effectiveScope: ExportScope =
        scope === 'selection' && !selectionAvailable ? 'document' : scope
      const result = await runExporter(selectedExporter.id, {
        document,
        selection,
        scope: effectiveScope,
        padding,
      })
      const delivered = await triggerDownload(result)

      if (!delivered) {
        setStatus('Export canceled')
        return
      }

      setStatus(`Exported ${result.filename}`)
      setOpen(false)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to export asset')
      console.error(error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="export-menu" data-open={open || undefined}>
      <button
        type="button"
        className="export-menu__toggle"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        Export
      </button>
      {open ? (
        <div className="export-menu__popover" role="dialog" aria-label="Export asset">
          <div className="export-menu__section">
            <span className="export-menu__label">Format</span>
            <div className="export-menu__options">
              {EXPORTERS.map((exporter) => (
                <label key={exporter.id} className="export-menu__option">
                  <input
                    type="radio"
                    name="export-format"
                    value={exporter.id}
                    checked={formatId === exporter.id}
                    onChange={() => setFormatId(exporter.id)}
                  />
                  <div className="export-menu__option-content">
                    <span className="export-menu__option-title">{exporter.label}</span>
                    <span className="export-menu__option-description">{exporter.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="export-menu__section">
            <span className="export-menu__label">Scope</span>
            <div className="export-menu__options export-menu__options--inline">
              <label className="export-menu__chip">
                <input
                  type="radio"
                  name="export-scope"
                  value="document"
                  checked={scope === 'document'}
                  onChange={() => setScope('document')}
                />
                <span>Full document</span>
              </label>
              <label className="export-menu__chip">
                <input
                  type="radio"
                  name="export-scope"
                  value="selection"
                  checked={scope === 'selection'}
                  onChange={() => setScope('selection')}
                  disabled={!selectionAvailable}
                />
                <span>Selection only</span>
              </label>
            </div>
            {!selectionAvailable && scope === 'selection' ? (
              <p className="export-menu__hint">Select glyphs to enable selection exports.</p>
            ) : null}
          </div>

          <div className="export-menu__section">
            <label className="export-menu__label" htmlFor="export-padding">
              Padding (glyph cells)
            </label>
            <input
              id="export-padding"
              className="export-menu__number-input"
              type="number"
              min={0}
              max={8}
              value={padding}
              onChange={(event) => setPadding(Number.parseInt(event.target.value, 10) || 0)}
            />
          </div>

          <div className="export-menu__footer">
            <button type="button" className="export-menu__secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="export-menu__primary"
              onClick={handleExport}
              disabled={isExporting || (!selectionAvailable && scope === 'selection')}
            >
              {isExporting ? 'Exporting…' : `Export ${selectedExporter?.label ?? ''}`}
            </button>
          </div>
          {status ? <p className="export-menu__status">{status}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
