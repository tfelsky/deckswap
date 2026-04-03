export type CommanderBracket = 1 | 2 | 3 | 4 | 5

export type CommanderBracketSummary = {
  bracket: CommanderBracket | null
  label: string
  description: string
  gameChangerCount: number
  gameChangers: string[]
  notes: string[]
  bracketRule: string
}

export type BracketCard = {
  card_name: string
  section: 'commander' | 'mainboard' | 'token'
  quantity: number
  mana_cost?: string | null
  cmc?: number | null
}

export const COMMANDER_BRACKETS = {
  1: {
    label: 'Exhibition',
    shortDescription: 'Theme-first, ultra-casual Commander.',
    rule:
      'No Game Changers, no intentional two-card infinite combos, no mass land denial, and no extra-turn cards.',
  },
  2: {
    label: 'Core',
    shortDescription: 'Unoptimized, straightforward Commander.',
    rule:
      'No Game Changers, no intentional two-card infinite combos, and no mass land denial. Tutors should be sparse and extra turns should not be chained.',
  },
  3: {
    label: 'Upgraded',
    shortDescription: 'Stronger than core, but not fully optimized.',
    rule:
      'Up to three Game Changers. No mass land denial. No intentional early two-card infinite combos. Extra turns should be low-volume and not chained.',
  },
  4: {
    label: 'Optimized',
    shortDescription: 'High-power Commander without tournament focus.',
    rule: 'No restrictions beyond the banned list.',
  },
  5: {
    label: 'cEDH',
    shortDescription: 'Competitive, metagame-focused Commander.',
    rule: 'No restrictions beyond the banned list, with a tournament-minded approach.',
  },
} as const

const OCTOBER_2025_GAME_CHANGERS = [
  'Drannith Magistrate',
  'Humility',
  "Serra's Sanctum",
  'Smothering Tithe',
  'Enlightened Tutor',
  "Teferi's Protection",
  'Consecrated Sphinx',
  'Cyclonic Rift',
  'Force of Will',
  'Fierce Guardianship',
  'Gifts Ungiven',
  'Intuition',
  'Mystical Tutor',
  'Narset, Parter of Veils',
  'Rhystic Study',
  "Thassa's Oracle",
  'Ad Nauseam',
  "Bolas's Citadel",
  'Braids, Cabal Minion',
  'Demonic Tutor',
  'Imperial Seal',
  'Necropotence',
  'Opposition Agent',
  'Orcish Bowmasters',
  'Tergrid, God of Fright',
  'Vampiric Tutor',
  'Gamble',
  "Jeska's Will",
  'Underworld Breach',
  'Crop Rotation',
  "Gaea's Cradle",
  'Natural Order',
  'Seedborn Muse',
  'Survival of the Fittest',
  'Worldly Tutor',
  'Aura Shards',
  'Coalition Victory',
  'Grand Arbiter Augustin IV',
  'Notion Thief',
  'Ancient Tomb',
  'Chrome Mox',
  'Field of the Dead',
  'Glacial Chasm',
  'Grim Monolith',
  "Lion's Eye Diamond",
  'Mana Vault',
  "Mishra's Workshop",
  'Mox Diamond',
  'Panoptic Mirror',
  'The One Ring',
  'The Tabernacle at Pendrell Vale',
] as const

const FEBRUARY_2026_GAME_CHANGER_ADDITIONS = ['Farewell', 'Biorhythm'] as const

export const GAME_CHANGER_NAMES = [
  ...OCTOBER_2025_GAME_CHANGERS,
  ...FEBRUARY_2026_GAME_CHANGER_ADDITIONS,
]

const GAME_CHANGER_SET = new Set(
  GAME_CHANGER_NAMES.map((name) => name.trim().toLowerCase())
)

const CEDH_SIGNAL_CARDS = [
  "Thassa's Oracle",
  'Ad Nauseam',
  'Underworld Breach',
  "Lion's Eye Diamond",
  'Mana Vault',
  'Chrome Mox',
  'Mox Diamond',
  'Grim Monolith',
  'Demonic Tutor',
  'Vampiric Tutor',
  'Imperial Seal',
  'Mystical Tutor',
  'Intuition',
  'Force of Will',
  'Fierce Guardianship',
]

const CEDH_SIGNAL_SET = new Set(
  CEDH_SIGNAL_CARDS.map((name) => name.trim().toLowerCase())
)

const EXTRA_TURN_NAMES = new Set(
  [
    'Time Warp',
    'Temporal Manipulation',
    'Capture of Jingzhou',
    'Temporal Mastery',
    'Part the Waterveil',
    'Time Stretch',
    "Nexus of Fate",
    'Walk the Aeons',
    'Expropriate',
    'Beacon of Tomorrows',
  ].map((name) => name.toLowerCase())
)

const MASS_LAND_DENIAL_NAMES = new Set(
  [
    'Armageddon',
    'Ravages of War',
    'Jokulhaups',
    'Obliterate',
    'Decree of Annihilation',
    'Ruination',
    'Cataclysm',
    'Catastrophe',
    'Winter Orb',
    'Static Orb',
    'Back to Basics',
    'Blood Moon',
    'Magus of the Moon',
  ].map((name) => name.toLowerCase())
)

function uniqueCardNames(cards: BracketCard[]) {
  const names = new Set<string>()

  for (const card of cards) {
    if (card.section === 'token') continue
    names.add(card.card_name.trim().toLowerCase())
  }

  return names
}

function gameChangersForDeck(cards: BracketCard[]) {
  const names = uniqueCardNames(cards)
  const matches = GAME_CHANGER_NAMES.filter((name) =>
    names.has(name.toLowerCase())
  )

  return matches
}

function countSetMatches(names: Set<string>, candidates: Set<string>) {
  let count = 0

  for (const name of names) {
    if (candidates.has(name)) count++
  }

  return count
}

export function getCommanderBracketLabel(bracket: CommanderBracket | null) {
  if (bracket == null) return 'Unrated'
  return `Bracket ${bracket}: ${COMMANDER_BRACKETS[bracket].label}`
}

export function getCommanderBracketSummary(
  cards: BracketCard[]
): CommanderBracketSummary {
  const deckCards = cards.filter((card) => card.section !== 'token')

  if (deckCards.length === 0) {
    return {
      bracket: null,
      label: 'Unrated',
      description: 'Not enough deck data to estimate a Commander bracket.',
      gameChangerCount: 0,
      gameChangers: [],
      notes: ['Import a full decklist to automatically estimate a Commander bracket.'],
      bracketRule: 'No bracket estimate available.',
    }
  }

  const names = uniqueCardNames(deckCards)
  const gameChangers = gameChangersForDeck(deckCards)
  const gameChangerCount = gameChangers.length
  const extraTurnCount = countSetMatches(names, EXTRA_TURN_NAMES)
  const massLandDenialCount = countSetMatches(names, MASS_LAND_DENIAL_NAMES)
  const cedhSignalCount = countSetMatches(names, CEDH_SIGNAL_SET)
  const averageCmc =
    deckCards.filter((card) => card.cmc != null).reduce((sum, card) => sum + Number(card.cmc), 0) /
    Math.max(1, deckCards.filter((card) => card.cmc != null).length)

  const notes: string[] = []

  if (gameChangerCount > 0) {
    notes.push(
      `${gameChangerCount} Game Changer${gameChangerCount === 1 ? '' : 's'} detected.`
    )
  } else {
    notes.push('No Game Changers detected.')
  }

  if (extraTurnCount > 0) {
    notes.push(
      `${extraTurnCount} extra-turn card${extraTurnCount === 1 ? '' : 's'} detected.`
    )
  }

  if (massLandDenialCount > 0) {
    notes.push(
      `${massLandDenialCount} mass land denial / prison indicator${massLandDenialCount === 1 ? '' : 's'} detected.`
    )
  }

  if (cedhSignalCount > 0) {
    notes.push(
      `${cedhSignalCount} cEDH signal card${cedhSignalCount === 1 ? '' : 's'} detected.`
    )
  }

  let bracket: CommanderBracket = 2

  if (gameChangerCount === 0 && extraTurnCount === 0 && massLandDenialCount === 0) {
    bracket = 2
  }

  if (
    gameChangerCount > 0 &&
    gameChangerCount <= 3 &&
    extraTurnCount <= 1 &&
    massLandDenialCount === 0
  ) {
    bracket = 3
  }

  if (gameChangerCount > 3 || extraTurnCount > 1 || massLandDenialCount > 0) {
    bracket = 4
  }

  if (cedhSignalCount >= 6 && gameChangerCount >= 6 && averageCmc > 0 && averageCmc <= 2.4) {
    bracket = 5
    notes.push(
      'This deck trips multiple competitive heuristics, but cEDH is still partly about player intent and metagame focus.'
    )
  } else if (bracket === 4) {
    notes.push(
      'Bracket 5 is not fully automatable because official cEDH classification depends partly on mindset and metagame focus.'
    )
  }

  return {
    bracket,
    label: getCommanderBracketLabel(bracket),
    description: COMMANDER_BRACKETS[bracket].shortDescription,
    gameChangerCount,
    gameChangers,
    notes,
    bracketRule: COMMANDER_BRACKETS[bracket].rule,
  }
}

export function isGameChangerCard(cardName: string) {
  return GAME_CHANGER_SET.has(cardName.trim().toLowerCase())
}
