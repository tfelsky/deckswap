export const DECK_LISTING_IMAGES_BUCKET = 'deck-listing-images'
export const MAX_DECK_LISTING_IMAGES = 6
export const MAX_DECK_LISTING_IMAGE_BYTES = 1_500_000
export const MAX_DECK_LISTING_IMAGE_TOTAL_BYTES = 7_500_000
export const MAX_DECK_LISTING_IMAGE_DIMENSION = 2000
export const MIN_DECK_LISTING_IMAGE_SHORT_EDGE = 900
export const DECK_LISTING_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp'

export type DeckListingImage = {
  id: number
  deck_id: number
  user_id: string
  storage_path: string
  public_url: string
  width: number | null
  height: number | null
  file_size_bytes: number | null
  mime_type: string | null
  sort_order: number
  created_at: string
}

export function sanitizeDeckListingImageRows(
  rows: Array<Partial<DeckListingImage>> | null | undefined
): DeckListingImage[] {
  return (rows ?? [])
    .map((row) => ({
      id: Number(row.id ?? 0),
      deck_id: Number(row.deck_id ?? 0),
      user_id: String(row.user_id ?? ''),
      storage_path: String(row.storage_path ?? ''),
      public_url: String(row.public_url ?? ''),
      width: row.width == null ? null : Number(row.width),
      height: row.height == null ? null : Number(row.height),
      file_size_bytes: row.file_size_bytes == null ? null : Number(row.file_size_bytes),
      mime_type: row.mime_type == null ? null : String(row.mime_type),
      sort_order: Number(row.sort_order ?? 0),
      created_at: String(row.created_at ?? ''),
    }))
    .filter((row) => row.id > 0 && row.deck_id > 0 && row.user_id && row.public_url)
    .sort((left, right) => left.sort_order - right.sort_order || left.id - right.id)
}

export function getDeckListingImageExtension(contentType: string) {
  switch (contentType.trim().toLowerCase()) {
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    default:
      return 'jpg'
  }
}

export function buildDeckListingImagePath({
  deckId,
  userId,
  extension,
}: {
  deckId: number
  userId: string
  extension: string
}) {
  const safeExtension = extension.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg'
  const randomSuffix = Math.random().toString(36).slice(2, 10)
  return `deck-${deckId}/${userId}/${Date.now()}-${randomSuffix}.${safeExtension}`
}
