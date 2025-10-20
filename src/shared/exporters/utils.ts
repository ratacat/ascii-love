import type {
  CanvasDocument,
  CanvasLayer,
  GlyphGroup,
  GlyphInstance,
  SelectionState,
} from '@shared/types/editor'

import type { ExportScope } from './types'

const deepClone = <T>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }

  return JSON.parse(JSON.stringify(value)) as T
}

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80) || 'asset'

interface BuildExportDocumentOptions {
  document: CanvasDocument
  selection: SelectionState
  scope: ExportScope
  padding: number
}

interface SelectionExtraction {
  layers: CanvasLayer[]
  groups: GlyphGroup[]
  glyphs: GlyphInstance[]
  bounds: {
    minX: number
    minY: number
    maxX: number
    maxY: number
  }
}

const computeDocumentBounds = (layers: CanvasLayer[]):
  | { minX: number; minY: number; maxX: number; maxY: number }
  | null => {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  let hasGlyphs = false

  layers.forEach((layer) => {
    layer.glyphs.forEach((glyph) => {
      hasGlyphs = true
      minX = Math.min(minX, glyph.position.x)
      minY = Math.min(minY, glyph.position.y)
      maxX = Math.max(maxX, glyph.position.x)
      maxY = Math.max(maxY, glyph.position.y)
    })
  })

  if (!hasGlyphs || !Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null
  }

  return { minX, minY, maxX, maxY }
}

const trimDocumentToBounds = (document: CanvasDocument, padding: number): CanvasDocument => {
  const bounds = computeDocumentBounds(document.layers)
  if (!bounds) {
    return {
      ...document,
      width: Math.max(1, document.width),
      height: Math.max(1, document.height),
    }
  }

  const width = Math.max(1, bounds.maxX - bounds.minX + 1 + padding * 2)
  const height = Math.max(1, bounds.maxY - bounds.minY + 1 + padding * 2)

  const layers = document.layers.map((layer, index) => ({
    ...deepClone(layer),
    glyphs: layer.glyphs.map((glyph) => ({
      ...deepClone(glyph),
      position: {
        x: glyph.position.x - bounds.minX + padding,
        y: glyph.position.y - bounds.minY + padding,
      },
    })),
    zIndex: index,
  }))

  return {
    ...document,
    width,
    height,
    layers,
  }
}

const extractSelection = (document: CanvasDocument, selection: SelectionState): SelectionExtraction | null => {
  const glyphIdSet = new Set(selection.glyphIds)
  if (!glyphIdSet.size) {
    return null
  }

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  const layers: CanvasLayer[] = []
  const glyphs: GlyphInstance[] = []

  document.layers.forEach((layer) => {
    const filteredGlyphs = layer.glyphs.filter((glyph) => glyphIdSet.has(glyph.id))
    if (!filteredGlyphs.length) {
      return
    }

    filteredGlyphs.forEach((glyph) => {
      minX = Math.min(minX, glyph.position.x)
      minY = Math.min(minY, glyph.position.y)
      maxX = Math.max(maxX, glyph.position.x)
      maxY = Math.max(maxY, glyph.position.y)
      glyphs.push(glyph)
    })

    layers.push({ ...deepClone(layer), glyphs: filteredGlyphs.map((glyph) => deepClone(glyph)) })
  })

  if (!glyphs.length || !Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null
  }

  const groups = document.groups
    .map((group) => {
      const groupGlyphs = group.glyphIds.filter((id) => glyphIdSet.has(id))
      if (!groupGlyphs.length) {
        return null
      }
      return { ...deepClone(group), glyphIds: groupGlyphs }
    })
    .filter((value): value is GlyphGroup => value !== null)

  return {
    layers,
    groups,
    glyphs,
    bounds: {
      minX,
      minY,
      maxX,
      maxY,
    },
  }
}

export const buildExportDocument = ({
  document,
  selection,
  scope,
  padding,
}: BuildExportDocumentOptions): CanvasDocument => {
  const base = deepClone(document)
  base.metadata = {
    ...base.metadata,
    exportedAt: new Date().toISOString(),
    exportScope: scope,
    padding,
  }

  if (scope === 'document' || !selection.glyphIds.length) {
    return trimDocumentToBounds(base, padding)
  }

  const selectionData = extractSelection(document, selection)
  if (!selectionData) {
    return base
  }

  const width = selectionData.bounds.maxX - selectionData.bounds.minX + 1 + padding * 2
  const height = selectionData.bounds.maxY - selectionData.bounds.minY + 1 + padding * 2

  const layers = selectionData.layers
    .map((layer, index) => {
      const adjustedGlyphs = layer.glyphs.map((glyph) => ({
        ...glyph,
        position: {
          x: glyph.position.x - selectionData.bounds.minX + padding,
          y: glyph.position.y - selectionData.bounds.minY + padding,
        },
        groupIds: glyph.groupIds.filter((groupId) =>
          selectionData.groups.some((group) => group.id === groupId),
        ),
      }))

      return {
        ...layer,
        glyphs: adjustedGlyphs,
        zIndex: index,
      }
    })
    .filter((layer) => layer.glyphs.length)

  const groups = selectionData.groups.map((group) => ({
    ...group,
    glyphIds: group.glyphIds.filter((glyphId) =>
      layers.some((layer) => layer.glyphs.some((glyph) => glyph.id === glyphId)),
    ),
  }))

  const animationHints = base.animationHints
    .map((hint) => ({
      ...hint,
      targetGroupIds: hint.targetGroupIds.filter((groupId) =>
        groups.some((group) => group.id === groupId),
      ),
    }))
    .filter((hint) => hint.targetGroupIds.length)

  return {
    ...base,
    id: `${document.id}-selection`,
    name: `${document.name} Selection`,
    width: Math.max(1, width),
    height: Math.max(1, height),
    layers,
    groups,
    animationHints,
  }
}

export const deriveExportFilename = (
  document: CanvasDocument,
  scope: ExportScope,
  extension: string,
  baseName?: string,
): string => {
  const name = baseName ?? document.name ?? 'asset'
  const suffix = scope === 'selection' ? '-selection' : ''
  return `${slugify(name)}${suffix ? `-${suffix.replace(/^-/, '')}` : ''}.${extension}`
}

export const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

export const cloneDocument = (document: CanvasDocument): CanvasDocument => deepClone(document)
