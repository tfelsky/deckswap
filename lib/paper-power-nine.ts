import { fetchScryfallCollection, scryfallToDeckCardUpdate } from '@/lib/scryfall/enrich'

type SupabaseLike = any

export const PERSONAL_POWER_NINE_CARD_COUNT = 9

export type PaperPowerNineCardInput = {
  slot: number
  name: string
  setCode: string
  collectorNumber: string
  finish: 'nonfoil' | 'foil' | 'etched'
}

type ScryfallMatchRow = {
  match: ReturnType<typeof scryfallToDeckCardUpdate> | null
  exactPrintMatched: boolean
}

type ArtistSearchCard = {
  name: string
  set_name?: string
  released_at?: string
}

type ArtistProfile = {
  artistName: string
  artistCardCount: number | null
  artistDebutRelease: string | null
  artistDebutSetName: string | null
  notableCards: string[]
  artistSummary: string
}

function normalizeText(value?: string | null) {
  return value?.trim() ?? ''
}

function normalizeKeyPart(value?: string | null) {
  return normalizeText(value).toLowerCase()
}

function printKey(setCode?: string | null, collectorNumber?: string | null) {
  const normalizedSet = normalizeKeyPart(setCode)
  const normalizedCollector = normalizeKeyPart(collectorNumber)

  if (!normalizedSet || !normalizedCollector) return null
  return `${normalizedSet}::${normalizedCollector}`
}

function nameKey(name: string) {
  return normalizeKeyPart(name)
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

function cardImageUrl(card: ReturnType<typeof scryfallToDeckCardUpdate>) {
  return card.image_url ?? null
}

function preferredPrice(
  card: ReturnType<typeof scryfallToDeckCardUpdate>,
  finish: PaperPowerNineCardInput['finish']
) {
  if (finish === 'etched') {
    return card.price_usd_etched ?? card.price_usd_foil ?? card.price_usd ?? null
  }

  if (finish === 'foil') {
    return card.price_usd_foil ?? card.price_usd ?? null
  }

  return card.price_usd ?? null
}

function toSentenceCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function normalizeArray(values?: string[] | null) {
  return Array.isArray(values) ? values.filter((value) => !!normalizeText(value)) : []
}

function describeColorIdentity(colors?: string[] | null) {
  const normalized = normalizeArray(colors)
  const labels: Record<string, string> = {
    W: 'white',
    U: 'blue',
    B: 'black',
    R: 'red',
    G: 'green',
  }

  if (normalized.length === 0) return 'colorless'
  if (normalized.length === 5) return 'five-color'
  return normalized.map((value) => labels[value] ?? value.toLowerCase()).join(', ')
}

function classifyPrimaryType(typeLine?: string | null) {
  const normalized = normalizeText(typeLine).toLowerCase()

  if (!normalized) return 'other'
  if (normalized.includes('creature')) return 'creature'
  if (normalized.includes('artifact')) return 'artifact'
  if (normalized.includes('enchantment')) return 'enchantment'
  if (normalized.includes('planeswalker')) return 'planeswalker'
  if (normalized.includes('instant')) return 'instant'
  if (normalized.includes('sorcery')) return 'sorcery'
  if (normalized.includes('land')) return 'land'
  if (normalized.includes('battle')) return 'battle'
  return 'other'
}

function rarityRank(rarity?: string | null) {
  switch (normalizeText(rarity).toLowerCase()) {
    case 'mythic':
      return 5
    case 'rare':
      return 4
    case 'special':
      return 3
    case 'uncommon':
      return 2
    case 'common':
      return 1
    default:
      return 0
  }
}

function rarityLabel(rarity?: string | null) {
  const normalized = normalizeText(rarity).toLowerCase()
  return normalized ? toSentenceCase(normalized) : 'Unknown'
}

function manaValueLabel(cmc?: number | null) {
  return typeof cmc === 'number' ? `mana value ${cmc}` : 'unknown mana value'
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url, { cache: 'no-store' })

  if (!response.ok) {
    throw new Error(`Scryfall request failed: ${response.status}`)
  }

  return (await response.json()) as T
}

async function fetchArtistProfile(artistName: string): Promise<ArtistProfile> {
  const encodedArtist = encodeURIComponent(`artist:"${artistName}" unique:cards`)
  const url = `https://api.scryfall.com/cards/search?q=${encodedArtist}&order=released&dir=asc`

  try {
    const response = await fetchJson<{
      total_cards?: number
      data?: ArtistSearchCard[]
    }>(url)

    const cards = response.data ?? []
    const debut = cards[0]
    const notableCards = cards
      .map((card) => normalizeText(card.name))
      .filter(Boolean)
      .slice(0, 6)

    const totalCards = typeof response.total_cards === 'number' ? response.total_cards : cards.length
    const debutRelease = normalizeText(debut?.released_at) || null
    const debutSetName = normalizeText(debut?.set_name) || null

    const summaryParts = [
      `${artistName} has ${totalCards || 'an unknown number of'} Scryfall-indexed cards.`,
      debutSetName
        ? `Their earliest result in this lookup is ${debutSetName}${debutRelease ? ` (${debutRelease})` : ''}.`
        : 'Their earliest indexed result was not available in this lookup.',
      notableCards.length > 0 ? `Other notable cards include ${notableCards.slice(0, 4).join(', ')}.` : '',
    ].filter(Boolean)

    return {
      artistName,
      artistCardCount: totalCards || null,
      artistDebutRelease: debutRelease,
      artistDebutSetName: debutSetName,
      notableCards,
      artistSummary: summaryParts.join(' '),
    }
  } catch {
    return {
      artistName,
      artistCardCount: null,
      artistDebutRelease: null,
      artistDebutSetName: null,
      notableCards: [],
      artistSummary: `${artistName} credit was captured, but the broader artist history lookup was unavailable.`,
    }
  }
}

function buildTopEightPoints(
  card: ReturnType<typeof scryfallToDeckCardUpdate>,
  finish: PaperPowerNineCardInput['finish'],
  artistProfile: ArtistProfile
) {
  const points = [
    `${card.card_name} is a ${rarityLabel(card.rarity)} ${classifyPrimaryType(card.type_line)} from ${card.set_name}.`,
    `This printing sits at ${manaValueLabel(card.cmc)} and carries the line "${normalizeText(card.type_line) || 'Type line unavailable'}".`,
    card.oracle_text
      ? `Rules text snapshot: ${card.oracle_text.split('\n')[0]}.`
      : 'Rules text snapshot was not available from Scryfall.',
    `Color identity reads as ${describeColorIdentity(card.color_identity)}.`,
    `Requested finish is ${finish === 'nonfoil' ? 'non-foil' : finish === 'etched' ? 'etched foil' : 'foil'}, with an estimated matched price of ${preferredPrice(card, finish) ? `$${preferredPrice(card, finish)?.toFixed(2)}` : 'price unavailable'}.`,
    card.can_be_commander
      ? 'This card can sit in the command zone, which gives it extra deck-building and identity weight.'
      : 'This card is not flagged as a commander piece, so the appeal here is more about role, art, or nostalgia than command-zone identity.',
    artistProfile.artistSummary,
    artistProfile.notableCards.length > 0
      ? `Artist adjacency: compare it with ${artistProfile.notableCards.slice(0, 3).join(', ')} from the same credited artist.`
      : `Artist adjacency: this printing is credited to ${artistProfile.artistName}.`,
  ]

  return points.slice(0, 8)
}

export function isPaperPowerNineSchemaMissing(message?: string | null) {
  if (!message) return false

  return (
    message.includes("relation 'public.paper_power_nine_submissions'") ||
    message.includes('relation "public.paper_power_nine_submissions"') ||
    message.includes("relation 'public.paper_power_nine_submission_cards'") ||
    message.includes('relation "public.paper_power_nine_submission_cards"') ||
    message.includes("Could not find the relation 'public.paper_power_nine_submissions'") ||
    message.includes("Could not find the relation 'public.paper_power_nine_submission_cards'")
  )
}

export function getPaperPowerNineSchemaHelpMessage(message?: string | null) {
  if (isPaperPowerNineSchemaMissing(message)) {
    return 'Personal Power 9 persistence is not set up in Supabase yet. Run the new Paper Power 9 migration, then submit again.'
  }

  return message ?? 'Personal Power 9 submission failed.'
}

export function validatePaperPowerNineCards(cards: PaperPowerNineCardInput[]) {
  if (cards.length !== PERSONAL_POWER_NINE_CARD_COUNT) {
    throw new Error(`Enter exactly ${PERSONAL_POWER_NINE_CARD_COUNT} cards.`)
  }

  for (const card of cards) {
    if (!normalizeText(card.name)) {
      throw new Error(`Card ${card.slot} is missing a name.`)
    }

    if (!normalizeText(card.setCode)) {
      throw new Error(`Card ${card.slot} is missing a set code.`)
    }

    if (!normalizeText(card.collectorNumber)) {
      throw new Error(`Card ${card.slot} is missing a collector number.`)
    }
  }
}

async function fetchCollectionSafe(
  identifiers: Array<
    | { name: string; set: string; collector_number: string }
    | { name: string }
  >
) {
  if (identifiers.length === 0) return []

  const all: Array<ReturnType<typeof scryfallToDeckCardUpdate>> = []

  for (const batch of chunk(identifiers, 75)) {
    const cards = await fetchScryfallCollection(batch)
    for (const card of cards) {
      all.push(scryfallToDeckCardUpdate(card))
    }
  }

  return all
}

function buildMatchMaps(cards: Array<ReturnType<typeof scryfallToDeckCardUpdate>>) {
  const byPrint = new Map<string, ReturnType<typeof scryfallToDeckCardUpdate>>()
  const byName = new Map<string, ReturnType<typeof scryfallToDeckCardUpdate>>()

  for (const card of cards) {
    const pKey = printKey(card.set_code, card.collector_number)
    if (pKey && !byPrint.has(pKey)) {
      byPrint.set(pKey, card)
    }

    const nKey = nameKey(card.card_name)
    if (nKey && !byName.has(nKey)) {
      byName.set(nKey, card)
    }
  }

  return { byPrint, byName }
}

export async function enrichPaperPowerNineCards(cards: PaperPowerNineCardInput[]) {
  validatePaperPowerNineCards(cards)

  const exactMatches = await fetchCollectionSafe(
    cards.map((card) => ({
      name: card.name,
      set: card.setCode,
      collector_number: card.collectorNumber,
    }))
  )

  const exactMaps = buildMatchMaps(exactMatches)
  const unmatchedCards = cards.filter((card) => {
    const pKey = printKey(card.setCode, card.collectorNumber)
    if (!pKey) return true
    return !exactMaps.byPrint.has(pKey)
  })

  let fallbackMaps = { byPrint: new Map(), byName: new Map() }
  if (unmatchedCards.length > 0) {
    const fallbackMatches = await fetchCollectionSafe(
      unmatchedCards.map((card) => ({ name: card.name }))
    )
    fallbackMaps = buildMatchMaps(fallbackMatches)
  }

  const enriched = cards.map((card): PaperPowerNineCardInput & ScryfallMatchRow & {
    imageUrl: string | null
    submittedName: string
    submittedSetCode: string
    submittedCollectorNumber: string
    requestedFinish: PaperPowerNineCardInput['finish']
    matchedPriceUsd: number | null
  } => {
    const pKey = printKey(card.setCode, card.collectorNumber)
    const exactMatch = pKey ? exactMaps.byPrint.get(pKey) ?? null : null
    const fallbackMatch = fallbackMaps.byName.get(nameKey(card.name)) ?? null
    const match = exactMatch ?? fallbackMatch

    return {
      ...card,
      submittedName: normalizeText(card.name),
      submittedSetCode: normalizeText(card.setCode).toLowerCase(),
      submittedCollectorNumber: normalizeText(card.collectorNumber),
      requestedFinish: card.finish,
      match,
      exactPrintMatched: !!exactMatch,
      imageUrl: match ? cardImageUrl(match) : null,
      matchedPriceUsd: match ? preferredPrice(match, card.finish) : null,
    }
  })

  const unresolved = enriched.filter((card) => !card.match)
  if (unresolved.length > 0) {
    const label = unresolved
      .map((card) => `#${card.slot} ${card.submittedName} (${card.submittedSetCode} ${card.submittedCollectorNumber})`)
      .join(', ')
    throw new Error(`Could not match these cards on Scryfall: ${label}.`)
  }

  return enriched
}

export async function createPaperPowerNineSubmission(
  supabase: SupabaseLike,
  args: {
    userId: string
    creditName: string
    contactEmail?: string | null
    story: string
    theme?: string | null
    cards: PaperPowerNineCardInput[]
  }
) {
  const enrichedCards = await enrichPaperPowerNineCards(args.cards)
  const coverImageUrl = enrichedCards.find((card) => card.imageUrl)?.imageUrl ?? null
  const exactMatchCount = enrichedCards.filter((card) => card.exactPrintMatched).length
  const contactEmail = normalizeText(args.contactEmail)
  const theme = normalizeText(args.theme)
  const artistNames = [...new Set(enrichedCards.map((card) => normalizeText(card.match?.artist_name)).filter(Boolean))]
  const artistProfiles = new Map<string, ArtistProfile>()

  for (const artistName of artistNames) {
    artistProfiles.set(artistName, await fetchArtistProfile(artistName))
  }

  const submissionResult = await supabase
    .from('paper_power_nine_submissions')
    .insert({
      user_id: args.userId,
      credit_name: normalizeText(args.creditName),
      contact_email: contactEmail || null,
      story: normalizeText(args.story),
      theme: theme || null,
      status: 'submitted',
      card_count: enrichedCards.length,
      exact_match_count: exactMatchCount,
      cover_image_url: coverImageUrl,
    })
    .select('id')
    .single()

  if (submissionResult.error || !submissionResult.data) {
    throw new Error(getPaperPowerNineSchemaHelpMessage(submissionResult.error?.message))
  }

  const submissionId = Number(submissionResult.data.id)

  const cardRows = enrichedCards.map((card) => ({
    ...(function () {
      const artistName = normalizeText(card.match?.artist_name)
      const artistProfile = artistProfiles.get(artistName) ?? null
      const topEightPoints = card.match
        ? buildTopEightPoints(
            card.match,
            card.requestedFinish,
            artistProfile ?? {
              artistName: artistName || 'Unknown artist',
              artistCardCount: null,
              artistDebutRelease: null,
              artistDebutSetName: null,
              notableCards: [],
              artistSummary: artistName
                ? `${artistName} credit was captured for this printing.`
                : 'Artist credit was unavailable for this printing.',
            }
          )
        : []

      return {
        artist_card_count: artistProfile?.artistCardCount ?? null,
        artist_debut_release: artistProfile?.artistDebutRelease ?? null,
        artist_debut_set_name: artistProfile?.artistDebutSetName ?? null,
        artist_notable_cards: artistProfile?.notableCards ?? [],
        artist_summary: artistProfile?.artistSummary ?? null,
        top_eight_points: topEightPoints,
      }
    })(),
    submission_id: submissionId,
    user_id: args.userId,
    slot_number: card.slot,
    submitted_name: card.submittedName,
    submitted_set_code: card.submittedSetCode,
    submitted_collector_number: card.submittedCollectorNumber,
    requested_finish: card.requestedFinish,
    exact_print_matched: card.exactPrintMatched,
    matched_price_usd: card.matchedPriceUsd,
    ...card.match,
  }))

  const cardsResult = await supabase.from('paper_power_nine_submission_cards').insert(cardRows)

  if (cardsResult.error) {
    await supabase.from('paper_power_nine_submissions').delete().eq('id', submissionId)
    throw new Error(getPaperPowerNineSchemaHelpMessage(cardsResult.error.message))
  }

  return {
    submissionId,
    exactMatchCount,
    coverImageUrl,
  }
}
