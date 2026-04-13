import { calculateSinglesPricingBreakdown, normalizeSinglesQuantity, roundUsd, type SinglesCartItem, type SinglesPricingBreakdown } from '@/lib/singles/pricing'

export type PublicSingleListing = {
  id: number
  user_id: string
  card_name: string
  quantity: number | null
  marketplace_quantity_available: number | null
  marketplace_price_usd: number | null
  marketplace_currency: string | null
  marketplace_visible: boolean | null
  marketplace_status: string | null
  marketplace_notes: string | null
  foil: boolean | null
  condition: string | null
  language: string | null
  set_code: string | null
  set_name: string | null
  collector_number: string | null
  image_url: string | null
  type_line: string | null
  oracle_text: string | null
  color_identity: string[] | null
}

export type PricedSinglesCartLine = {
  listingId: number
  sellerUserId: string
  cardName: string
  setName: string | null
  setCode: string | null
  collectorNumber: string | null
  foil: boolean
  condition: string | null
  imageUrl: string | null
  quantity: number
  availableQuantity: number
  unitPriceUsd: number
  lineSubtotalUsd: number
}

export type SinglesQuote = {
  sellerUserId: string | null
  items: PricedSinglesCartLine[]
  pricing: SinglesPricingBreakdown
}

export function normalizeMarketplaceStatus(value?: string | null) {
  const candidate = String(value ?? '').trim().toLowerCase()
  return candidate || 'draft'
}

export function isPublicSingleListing(row: PublicSingleListing) {
  return (
    row.marketplace_visible === true &&
    normalizeMarketplaceStatus(row.marketplace_status) === 'active' &&
    Number(row.marketplace_price_usd ?? 0) > 0 &&
    Number(row.marketplace_quantity_available ?? 0) > 0
  )
}

export function formatSingleCondition(value?: string | null) {
  switch (String(value ?? '').trim()) {
    case 'light_play':
      return 'LP'
    case 'moderate_play':
      return 'MP'
    case 'heavy_play':
      return 'HP'
    case 'damaged':
      return 'DMG'
    default:
      return 'NM'
  }
}

export function buildSinglesQuote(args: {
  cartItems: SinglesCartItem[]
  listings: PublicSingleListing[]
}) {
  const listingMap = new Map(args.listings.map((listing) => [listing.id, listing]))
  const validCartItems = args.cartItems
    .map((item) => ({
      singleInventoryItemId: Number(item.singleInventoryItemId),
      quantity: normalizeSinglesQuantity(item.quantity),
    }))
    .filter((item) => Number.isFinite(item.singleInventoryItemId) && item.quantity > 0)

  const items: PricedSinglesCartLine[] = []

  for (const cartItem of validCartItems) {
    const listing = listingMap.get(cartItem.singleInventoryItemId)
    if (!listing || !isPublicSingleListing(listing)) continue

    const availableQuantity = normalizeSinglesQuantity(Number(listing.marketplace_quantity_available ?? 0))
    const quantity = Math.min(cartItem.quantity, availableQuantity)

    if (quantity <= 0) continue

    const unitPriceUsd = roundUsd(Number(listing.marketplace_price_usd ?? 0))
    if (unitPriceUsd <= 0) continue

    items.push({
      listingId: listing.id,
      sellerUserId: listing.user_id,
      cardName: listing.card_name,
      setName: listing.set_name,
      setCode: listing.set_code,
      collectorNumber: listing.collector_number,
      foil: Boolean(listing.foil),
      condition: listing.condition,
      imageUrl: listing.image_url,
      quantity,
      availableQuantity,
      unitPriceUsd,
      lineSubtotalUsd: roundUsd(unitPriceUsd * quantity),
    })
  }

  const sellerUserId = items[0]?.sellerUserId ?? null
  const singleSellerItems = sellerUserId
    ? items.filter((item) => item.sellerUserId === sellerUserId)
    : items
  const subtotal = singleSellerItems.reduce((sum, item) => sum + item.lineSubtotalUsd, 0)
  const itemCount = singleSellerItems.reduce((sum, item) => sum + item.quantity, 0)

  return {
    sellerUserId,
    items: singleSellerItems,
    pricing: calculateSinglesPricingBreakdown(subtotal, itemCount),
  } satisfies SinglesQuote
}
