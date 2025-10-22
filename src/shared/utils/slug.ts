export const slugify = (value: string, fallback = 'token'): string => {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80)

  return normalized || fallback
}

export const ensureUniqueSlug = (candidate: string, used: Map<string, number>): string => {
  const count = used.get(candidate) ?? 0
  const suffix = count === 0 ? '' : `-${count + 1}`
  used.set(candidate, count + 1)
  return `${candidate}${suffix}`
}
