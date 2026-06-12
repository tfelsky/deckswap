export const GOVERNMENT_IDS_BUCKET = 'government-ids'
export const MAX_GOVERNMENT_ID_BYTES = 5_000_000
export const GOVERNMENT_ID_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}

export function isAllowedGovernmentIdMimeType(mimeType: string) {
  return (GOVERNMENT_ID_MIME_TYPES as readonly string[]).includes(
    mimeType.trim().toLowerCase()
  )
}

export function getGovernmentIdExtension(mimeType: string) {
  return EXTENSION_BY_MIME[mimeType.trim().toLowerCase()] ?? 'bin'
}

export function buildGovernmentIdPath(userId: string, extension: string) {
  const suffix = Math.random().toString(36).slice(2, 10)
  return `${userId}/${Date.now()}-${suffix}.${extension}`
}

// The government_id_storage_key column previously held free-text intake
// references; only values shaped like our storage paths point at a real
// uploaded document.
export function isGovernmentIdStoragePath(value?: string | null) {
  if (!value) return false
  return /^[0-9a-f-]{36}\/\d+-[a-z0-9]+\.(jpg|png|webp|pdf)$/i.test(value.trim())
}
