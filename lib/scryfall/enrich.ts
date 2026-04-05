type ScryfallCard = {
  id: string
  oracle_id?: string
  name: string
  set: string
  set_name: string
  collector_number: string
  artist?: string
  released_at?: string
  cmc?: number
  power?: string
  toughness?: string
  foil?: boolean
  finishes?: string[]
  oracle_text?: string
  type_line?: string
  rarity?: string
  mana_cost?: string
  color_identity?: string[]
  keywords?: string[]
  prices?: {
    usd?: string | null
    usd_foil?: string | null
    usd_etched?: string | null
    eur?: string | null
    eur_foil?: string | null
    eur_etched?: string | null
    tix?: string | null
  }
  image_uris?: {
    small?: string
    normal?: string
    large?: string
  }
  card_faces?: Array<{
    image_uris?: {
      small?: string
      normal?: string
      large?: string
    }
  }>
}

type Identifier = {
  name?: string
  set?: string
  collector_number?: string
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function firstImage(card: ScryfallCard): string | null {
  return (
    card.image_uris?.normal ||
    card.card_faces?.[0]?.image_uris?.normal ||
    null
  )
}

function isLegendary(typeLine?: string) {
  return !!typeLine && typeLine.toLowerCase().includes('legendary')
}

function isBackground(typeLine?: string) {
  return !!typeLine && typeLine.toLowerCase().includes('background')
}

function canBeCommander(card: ScryfallCard) {
  const oracle = card.oracle_text?.toLowerCase() || ''
  const typeLine = card.type_line?.toLowerCase() || ''
  return (
    typeLine.includes('legendary creature') ||
    oracle.includes('can be your commander') ||
    oracle.includes('choose a background') ||
    typeLine.includes('background')
  )
}

function extractPartnerWithName(oracleText?: string): string | null {
  if (!oracleText) return null
  const match = oracleText.match(/partner with ([^\n.]+)/i)
  return match?.[1]?.trim() || null
}

function toNumeric(value?: string | null) {
  return value ? Number(value) : null
}

export async function fetchScryfallCollection(
  identifiers: Identifier[]
): Promise<ScryfallCard[]> {
  const chunks = chunk(identifiers, 75)
  const all: ScryfallCard[] = []

  for (const ids of chunks) {
    const res = await fetch('https://api.scryfall.com/cards/collection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifiers: ids }),
      cache: 'no-store',
    })

    if (!res.ok) {
      throw new Error(`Scryfall collection lookup failed: ${res.status}`)
    }

    const json = await res.json()
    if (Array.isArray(json.data)) all.push(...json.data)
  }

  return all
}

export function scryfallToDeckCardUpdate(card: ScryfallCard) {
  return {
    scryfall_id: card.id,
    oracle_id: card.oracle_id ?? null,
    card_name: card.name,
    set_code: card.set,
    set_name: card.set_name,
    collector_number: card.collector_number,
    artist_name: card.artist ?? null,
    released_at: card.released_at ?? null,
    finishes: card.finishes ?? [],
    oracle_text: card.oracle_text ?? null,
    type_line: card.type_line ?? null,
    rarity: card.rarity ?? null,
    mana_cost: card.mana_cost ?? null,
    cmc: card.cmc ?? null,
    power: card.power ?? null,
    toughness: card.toughness ?? null,
    color_identity: card.color_identity ?? [],
    keywords: card.keywords ?? [],
    image_url: firstImage(card),
    is_legendary: isLegendary(card.type_line),
    is_background: isBackground(card.type_line),
    can_be_commander: canBeCommander(card),
    partner_with_name: extractPartnerWithName(card.oracle_text),
    price_usd: toNumeric(card.prices?.usd),
    price_usd_foil: toNumeric(card.prices?.usd_foil),
    price_usd_etched: toNumeric(card.prices?.usd_etched),
    price_eur: toNumeric(card.prices?.eur),
    price_eur_foil: toNumeric(card.prices?.eur_foil),
    price_tix: toNumeric(card.prices?.tix),
  }
}

export function scryfallToDeckTokenUpdate(card: ScryfallCard) {
  return {
    scryfall_id: card.id,
    oracle_id: card.oracle_id ?? null,
    token_name: card.name,
    set_code: card.set,
    set_name: card.set_name,
    collector_number: card.collector_number,
    finishes: card.finishes ?? [],
    type_line: card.type_line ?? null,
    image_url: firstImage(card),
  }
}
