export type ValueSignalKind = 'set' | 'early_foil' | 'playable' | 'commander_staple'
export type ValueSignalStrength = 'strong' | 'moderate'

export type ValueSignal = {
  kind: ValueSignalKind
  label: string
  detail: string
  strength: ValueSignalStrength
}

export type ValueCon = {
  label: string
  detail: string
}

export type CardValueSignals = {
  signals: ValueSignal[]
  cons: ValueCon[]
}

export type CommanderStapleData = {
  commanderName?: string | null
  inclusionPercent?: number | null
  edhrecRank?: number | null
  commanderDeckCount?: number | null
}

export type CardValueInput = {
  cardName: string
  setCode?: string | null
  setName?: string | null
  releasedAt?: string | null
  rarity?: string | null
  foil?: boolean | null
  finishes?: string[] | null
  oracleText?: string | null
  typeLine?: string | null
  keywords?: string[] | null
  cmc?: number | null
  condition?: string | null
  language?: string | null
  priceUsd?: number | null
  priceUsdFoil?: number | null
  commanderData?: CommanderStapleData | null
}

// Alpha through The Dark plus Arabian Nights/Antiquities/Legends: the sets
// collectors treat as a tier of their own regardless of the card printed.
const ICONIC_VINTAGE_SET_CODES = new Set(['lea', 'leb', '2ed', 'arn', 'atq', 'leg', 'drk'])

// Urza's Destiny (June 1999) closed out the Reserved List print runs.
const RESERVED_LIST_ERA_END = Date.parse('1999-07-01')
// 8th Edition (July 2003) introduced the modern frame; everything before it
// is the old-border era with permanently capped supply.
const OLD_FRAME_ERA_END = Date.parse('2003-07-28')
// Urza's Legacy (February 1999) printed the first booster foils.
const FIRST_FOILS_AT = Date.parse('1999-02-01')
const OLDER_FOIL_ERA_END = Date.parse('2010-01-01')
// Collector boosters (late 2019) permanently raised premium-finish supply.
const HIGH_SUPPLY_ERA_START = Date.parse('2019-10-01')

const COMMANDER_STAPLE_INCLUSION_STRONG = 40
const COMMANDER_STAPLE_INCLUSION_MODERATE = 15

const BULK_PRICE_THRESHOLD = 0.5
const DEEP_SUPPLY_PRICE_THRESHOLD = 2

type OraclePattern = {
  pattern: RegExp
  note: string
}

// Text patterns that track competitive play patterns across formats: tutors,
// fast mana, cheap interaction, card advantage, and free/extra-resource effects.
const PLAYABLE_ORACLE_PATTERNS: OraclePattern[] = [
  { pattern: /search your library/i, note: 'tutoring' },
  { pattern: /draw (a card|two|three|x|that many)\b/i, note: 'card advantage' },
  { pattern: /counter target/i, note: 'counterspell interaction' },
  { pattern: /destroy target|exile target|destroy all|exile all/i, note: 'removal' },
  { pattern: /add \{|add one mana|add two mana|add three mana/i, note: 'mana acceleration' },
  { pattern: /return target .* (to the battlefield|from your graveyard)/i, note: 'recursion' },
  { pattern: /take an extra turn|extra combat/i, note: 'extra turns/combats' },
  { pattern: /without paying (its|their) mana cost/i, note: 'free spells' },
  { pattern: /can'?t be countered/i, note: 'resilience' },
]

// Text patterns that show up disproportionately in Commander decklists when
// no EDHREC data is cached for the card yet.
const COMMANDER_ORACLE_PATTERNS: RegExp[] = [
  /each opponent/i,
  /add (one|two|three) mana of any color/i,
  /whenever you cast (a|your) (commander|legendary)/i,
  /players? can'?t/i,
]

function parseDateMs(value?: string | null): number | null {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeRarity(value?: string | null) {
  return String(value ?? '').trim().toLowerCase()
}

function unitPrice(input: CardValueInput): number | null {
  const value = input.foil
    ? input.priceUsdFoil ?? input.priceUsd
    : input.priceUsd ?? input.priceUsdFoil
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function buildSetSignal(input: CardValueInput): ValueSignal | null {
  const setCode = String(input.setCode ?? '').trim().toLowerCase()
  const setName = input.setName?.trim() || setCode.toUpperCase() || 'this set'
  const releasedMs = parseDateMs(input.releasedAt)

  if (ICONIC_VINTAGE_SET_CODES.has(setCode)) {
    return {
      kind: 'set',
      label: 'Iconic vintage set',
      detail: `${setName} is one of the earliest Magic sets; supply is fixed and collector demand is durable.`,
      strength: 'strong',
    }
  }

  if (releasedMs !== null && releasedMs < RESERVED_LIST_ERA_END) {
    return {
      kind: 'set',
      label: 'Reserved List era',
      detail: `${setName} printed during the Reserved List era (pre-July 1999); print runs from this period will never be repeated at scale.`,
      strength: 'strong',
    }
  }

  if (releasedMs !== null && releasedMs < OLD_FRAME_ERA_END) {
    return {
      kind: 'set',
      label: 'Old-frame era set',
      detail: `${setName} predates the 2003 frame change; old-border printings carry a lasting nostalgia premium.`,
      strength: 'moderate',
    }
  }

  return null
}

function buildEarlyFoilSignal(input: CardValueInput): ValueSignal | null {
  if (!input.foil) return null
  const releasedMs = parseDateMs(input.releasedAt)
  if (releasedMs === null || releasedMs < FIRST_FOILS_AT) return null

  if (releasedMs < OLD_FRAME_ERA_END) {
    return {
      kind: 'early_foil',
      label: 'Early foil (1999-2003)',
      detail:
        'Foils from the first foil era are scarce - roughly 1 per booster box in some runs - and command large multipliers over non-foils.',
      strength: 'strong',
    }
  }

  if (releasedMs < OLDER_FOIL_ERA_END) {
    return {
      kind: 'early_foil',
      label: 'Older foil printing',
      detail: 'Pre-2010 foils were printed at much lower rates than modern collector-booster foils.',
      strength: 'moderate',
    }
  }

  return null
}

function buildPlayableSignal(input: CardValueInput): ValueSignal | null {
  const oracle = input.oracleText ?? ''
  if (!oracle) return null

  const hits = PLAYABLE_ORACLE_PATTERNS.filter(({ pattern }) => pattern.test(oracle))
  if (hits.length === 0) return null

  const notes = hits.map((hit) => hit.note)
  const cheap = typeof input.cmc === 'number' && input.cmc <= 2
  const strong = hits.length >= 2 || (hits.length === 1 && cheap)

  return {
    kind: 'playable',
    label: strong ? 'Highly playable effect' : 'Playable effect',
    detail: `Card text lines up with in-demand effects: ${notes.join(', ')}${
      cheap ? ' at a low mana cost' : ''
    }.`,
    strength: strong ? 'strong' : 'moderate',
  }
}

function buildCommanderStapleSignal(input: CardValueInput): ValueSignal | null {
  const data = input.commanderData
  const inclusion =
    typeof data?.inclusionPercent === 'number' && Number.isFinite(data.inclusionPercent)
      ? data.inclusionPercent
      : null

  if (inclusion !== null && inclusion >= COMMANDER_STAPLE_INCLUSION_MODERATE) {
    const strong = inclusion >= COMMANDER_STAPLE_INCLUSION_STRONG
    const commander = data?.commanderName?.trim()
    return {
      kind: 'commander_staple',
      label: strong ? 'Commander staple' : 'Popular Commander include',
      detail: commander
        ? `EDHREC shows this card in ${inclusion}% of ${commander} decks.`
        : `EDHREC shows this card in ${inclusion}% of decks for its top commander.`,
      strength: strong ? 'strong' : 'moderate',
    }
  }

  const oracle = input.oracleText ?? ''
  if (oracle && COMMANDER_ORACLE_PATTERNS.some((pattern) => pattern.test(oracle))) {
    return {
      kind: 'commander_staple',
      label: 'Commander-shaped text',
      detail:
        'No EDHREC data cached yet, but the card text targets multiplayer tables (each-opponent or any-color effects).',
      strength: 'moderate',
    }
  }

  return null
}

function buildCons(input: CardValueInput, signals: ValueSignal[]): ValueCon[] {
  const cons: ValueCon[] = []
  const price = unitPrice(input)
  const rarity = normalizeRarity(input.rarity)
  const releasedMs = parseDateMs(input.releasedAt)
  const condition = String(input.condition ?? '').trim()
  const language = String(input.language ?? 'en').trim().toLowerCase()

  if (price !== null && price < BULK_PRICE_THRESHOLD) {
    cons.push({
      label: 'Bulk-tier price',
      detail: 'Current market price sits in bulk territory; shipping and fees can eat the whole margin.',
    })
  } else if (
    price !== null &&
    price < DEEP_SUPPLY_PRICE_THRESHOLD &&
    (rarity === 'common' || rarity === 'uncommon')
  ) {
    cons.push({
      label: 'Deep supply at this rarity',
      detail: 'Low-priced commons and uncommons rarely appreciate unless a format shake-up hits.',
    })
  }

  if (releasedMs !== null && releasedMs >= HIGH_SUPPLY_ERA_START) {
    cons.push({
      label: 'High-supply printing era',
      detail:
        'Printed after collector boosters launched (late 2019); reprint and supply pressure keep most prices in check.',
    })
  }

  if (input.foil && releasedMs !== null && releasedMs >= FIRST_FOILS_AT && releasedMs < OLD_FRAME_ERA_END) {
    cons.push({
      label: 'Condition-sensitive foil',
      detail: 'Early foils are prone to curl and print lines; buyers discount hard for anything below Near Mint.',
    })
  }

  if (
    input.foil &&
    typeof input.priceUsdFoil === 'number' &&
    typeof input.priceUsd === 'number' &&
    input.priceUsd > 0 &&
    input.priceUsdFoil <= input.priceUsd * 1.1
  ) {
    cons.push({
      label: 'Thin foil premium',
      detail: 'The foil is priced within ~10% of the non-foil, so the finish is not adding value right now.',
    })
  }

  if (condition && condition !== 'near_mint') {
    cons.push({
      label: 'Below Near Mint',
      detail: 'Played copies typically clear 10-30% under NM comps, more for older cards.',
    })
  }

  if (language && language !== 'en') {
    cons.push({
      label: 'Non-English copy',
      detail: 'Non-English cards trade in a thinner market; expect slower sales outside a few premium languages.',
    })
  }

  if (signals.length === 0 && cons.length === 0) {
    cons.push({
      label: 'No standout signal',
      detail: 'Nothing in set, finish, playability, or Commander data stands out; price likely tracks bulk supply.',
    })
  }

  return cons
}

export function computeCardValueSignals(input: CardValueInput): CardValueSignals {
  const signals = [
    buildSetSignal(input),
    buildEarlyFoilSignal(input),
    buildPlayableSignal(input),
    buildCommanderStapleSignal(input),
  ].filter((signal): signal is ValueSignal => signal !== null)

  return { signals, cons: buildCons(input, signals) }
}

export function getValueSignalBadgeClass(strength: ValueSignalStrength) {
  return strength === 'strong'
    ? 'border-emerald-400/30 bg-emerald-400/15 text-emerald-200'
    : 'border-sky-400/20 bg-sky-400/10 text-sky-200'
}
