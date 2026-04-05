import type { ImportedDeckCard } from './types'

function normalizeLine(line: string) {
  return line.trim().replace(/\s+/g, ' ')
}

function stripBulletPrefix(line: string) {
  return line.replace(/^[-*•]+\s*/, '')
}

function splitDelimitedLine(line: string, delimiter: string) {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i++
        continue
      }

      inQuotes = !inQuotes
      continue
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  cells.push(current.trim())
  return cells
}

function normalizeHeader(header: string) {
  return header.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function getFirstValue(
  row: Record<string, string>,
  keys: string[]
) {
  for (const key of keys) {
    const value = row[key]
    if (value) return value
  }

  return ''
}

function parseFoilValue(value: string) {
  const normalized = value.trim().toLowerCase()
  return (
    normalized === 'foil' ||
    normalized === 'true' ||
    normalized === 'yes' ||
    normalized === 'y' ||
    normalized === '1'
  )
}

function parseTruthyValue(value: string) {
  const normalized = value.trim().toLowerCase()
  return (
    normalized === 'true' ||
    normalized === 'yes' ||
    normalized === 'y' ||
    normalized === '1' ||
    normalized === 'commander' ||
    normalized === 'primary'
  )
}

const COMMON_TOKEN_NAMES = new Set([
  'adventure',
  'aetherborn',
  "ajani's pridemate",
  'angel',
  'antelope',
  'ape',
  'army',
  'assassin',
  'avatar',
  'badger',
  'balloon',
  'barbarian',
  'bat',
  'bear',
  'beast',
  'beeble',
  'blinkmoth',
  'bird',
  'blood',
  'boar',
  'brainiac',
  'bramble',
  'brushwagg',
  "c'tan shard",
  'camarid',
  'camel',
  'cat',
  'centaur',
  'citizen',
  'clue',
  'comet',
  'companion',
  'crab',
  'construct',
  'copy',
  'coward',
  'curse',
  'cyberman',
  'city\'s blessing',
  'demon',
  'devil',
  'dinosaur',
  'dog',
  'dungeon',
  'dragon',
  'drake',
  'dryad',
  'dwarf',
  'dreadnought',
  'egg',
  'emblem',
  'elephant',
  'eldrazi',
  'eldrazi scion',
  'eldrazi spawn',
  'elemental',
  'elf warrior',
  'faerie',
  'faerie dragon',
  'faerie rogue',
  'ferret',
  'fish',
  'fox',
  'food',
  'fractal',
  'frog',
  'gargoyle',
  'germ',
  'ghoul',
  'giant',
  'gnome',
  'goblin',
  'god',
  'gold',
  'golem',
  'goat',
  'gremlin',
  'guest',
  'hamster',
  'hellion',
  'hippo',
  'horror',
  'horse',
  'human',
  'human cleric',
  'human rogue',
  'human soldier',
  'hydra',
  'incubator',
  'insect',
  'jackal',
  'jellyfish',
  'juggernaut',
  'junk',
  'kavu',
  'knight',
  'kobold',
  'kraken',
  'lander',
  'leech',
  'lesson',
  'licid',
  'llama',
  'loxodon',
  'map',
  'marit lage',
  'merfolk',
  'metathran',
  'mime',
  'minion',
  'monk',
  'moon',
  'mouse',
  'myr',
  'nightmare',
  'ninja',
  'nomad',
  'ooze',
  'orc',
  'orc army',
  'ox',
  'pegasus',
  'pentavite',
  'pest',
  'pincher',
  'pirate',
  'phyrexian',
  'phyrexian horror',
  'pilot',
  'phyrexian germ',
  'plant',
  'poison',
  'poison counter',
  'pony',
  'powerstone',
  'prism',
  'processor',
  'raccoon',
  'rabbit',
  'ranger',
  'rat',
  'rebel',
  'reflection',
  'remnant',
  'rhino',
  'robot',
  'rock',
  'rogue',
  'role',
  'samurai',
  'saproling',
  'satyr',
  'scion',
  'scout',
  'serpent',
  'serf',
  'servo',
  'shapeshifter',
  'shark',
  'sheep',
  'ship',
  'shrub',
  'skunk',
  'sliver',
  'slug',
  'snail',
  'snake',
  'skeleton',
  'soldier',
  'spawn',
  'speed',
  'spider',
  'spirit',
  'squid',
  'squirrel',
  'starfish',
  'stone',
  'tentacle',
  'the initiative',
  'the monarch',
  'the ring',
  'thopter',
  'thrull',
  'time lord',
  'tombspawn',
  'troll',
  'treasure',
  'treefolk',
  'triskelavite',
  'turtle',
  'tyranid',
  'volver',
  'vampire',
  'wall',
  'warlock',
  'warrior',
  'wizard',
  'wolf',
  'word',
  'wurm',
  'yeti',
  'zombie',
  'zombie army',
])

const TOKEN_NAME_PATTERNS = [
  / army$/i,
  / class$/i,
  / counter$/i,
  /^emblem\b/i,
  / emblem$/i,
  / incubator$/i,
  / incarnation$/i,
  / manifestation$/i,
  / prelude$/i,
  / role$/i,
  /^dungeon\b/i,
  /^initiative\b/i,
  /^monarch\b/i,
  /^poison\b/i,
  /^the city's blessing$/i,
  / shard$/i,
  / sliver$/i,
  /^the monarch$/i,
  /^the initiative$/i,
  /^the ring$/i,
]

const HARDCODED_NON_TOKEN_LANDS = new Set([
  'plains',
  'island',
  'swamp',
  'mountain',
  'forest',
  'wastes',
])

export function isHardcodedNonTokenLand(cardName: string) {
  return HARDCODED_NON_TOKEN_LANDS.has(cardName.trim().toLowerCase())
}

export function isLikelyTokenCard(cardName: string, setCode?: string | null) {
  const normalizedName = cardName.trim().toLowerCase()

  if (isHardcodedNonTokenLand(normalizedName)) {
    return false
  }

  if (COMMON_TOKEN_NAMES.has(normalizedName)) {
    return true
  }

  return TOKEN_NAME_PATTERNS.some((pattern) => pattern.test(cardName.trim()))
}

function isLikelyArchidektToken(card: ImportedDeckCard) {
  return isLikelyTokenCard(card.cardName, card.setCode)
}

function inferSectionFromArchidektRow(
  row: Record<string, string>
): 'commander' | 'mainboard' | 'sideboard' | 'token' {
  const commanderFlag = getFirstValue(row, [
    'commander',
    'iscommander',
    'isprimarycommander',
    'ispartnercommander',
  ])

  if (parseTruthyValue(commanderFlag)) {
    return 'commander'
  }

  const category = getFirstValue(row, [
    'category',
    'categories',
    'section',
    'group',
    'groups',
    'board',
  ]).toLowerCase()

  if (
    category.includes('token') ||
    category.includes('emblem') ||
    category.includes('helper')
  ) {
    return 'token'
  }

  if (
    category.includes('sideboard') ||
    category.includes('maybeboard') ||
    category.includes('companion')
  ) {
    return 'sideboard'
  }

  if (category.includes('commander')) {
    return 'commander'
  }

  return 'mainboard'
}

function parseArchidektTable(input: string): ImportedDeckCard[] {
  const lines = input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) return []

  const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(',') ? ',' : null
  if (!delimiter) return []

  const headers = splitDelimitedLine(lines[0], delimiter).map(normalizeHeader)

  const quantityIndex = headers.findIndex((header) =>
    ['quantity', 'qty', 'count', 'amount'].includes(header)
  )
  const nameIndex = headers.findIndex((header) =>
    ['card', 'name', 'cardname', 'cardtitle'].includes(header)
  )

  if (quantityIndex === -1 || nameIndex === -1) {
    return []
  }

  const cards: ImportedDeckCard[] = []

  for (const line of lines.slice(1)) {
    const values = splitDelimitedLine(line, delimiter)
    const row = Object.fromEntries(
      headers.map((header, index) => [header, values[index]?.trim() ?? ''])
    )

    const quantity = Number(row[headers[quantityIndex]])
    const cardName = row[headers[nameIndex]]?.trim()

    if (!quantity || !cardName) continue

    cards.push({
      section: inferSectionFromArchidektRow(row),
      quantity,
      cardName,
      foil: parseFoilValue(
        getFirstValue(row, ['foil', 'finish', 'printing', 'iscardfoil'])
      ),
      setCode:
        getFirstValue(row, ['setcode', 'set', 'editioncode']).toLowerCase() || undefined,
      setName: getFirstValue(row, ['setname', 'edition', 'editionname']) || undefined,
      collectorNumber:
        getFirstValue(row, ['collectornumber', 'number', 'cn']) || undefined,
    })
  }

  return cards
}

function parseCardLine(
  line: string,
  currentSection: 'commander' | 'mainboard' | 'sideboard' | 'token'
): ImportedDeckCard | null {
  const cleaned = normalizeLine(stripBulletPrefix(line))

  if (!cleaned) return null
  if (cleaned.startsWith('//')) return null
  if (cleaned.startsWith('#')) return null
  // Supports:
  // 1 Sol Ring
  // 1x Sol Ring
  // 28x Plains (fdn) 273
  // 1x Adventurer's Inn (fin) 271 *F*
  // 1 Leonin Relic-Warder (plst) C17-65
  const qtyMatch = cleaned.match(/^(\d+)x?\s+(.+)$/i)
  const trailingQtyMatch = cleaned.match(/^(.+?)\s+x?(\d+)$/i)
  const colonSectionMatch = cleaned.match(
    /^(commander|commanders|mainboard|maindeck|deck|sideboard|maybeboard|companion|companions|tokens|token)\s*:\s*(.+)$/i
  )

  if (colonSectionMatch) {
    const inlineSection = colonSectionMatch[1].toLowerCase()
    const inlineCard = parseCardLine(
      colonSectionMatch[2],
      inlineSection.startsWith('commander')
        ? 'commander'
        : inlineSection.startsWith('sideboard') ||
          inlineSection.startsWith('maybeboard') ||
          inlineSection.startsWith('companion')
        ? 'sideboard'
        : inlineSection.startsWith('token')
        ? 'token'
        : 'mainboard'
    )
    return inlineCard
  }

  const prefixedSectionMatch = cleaned.match(/^(sb|sideboard|maybeboard|mb|cmdr|commander)\s*[:\-]\s*(.+)$/i)
  if (prefixedSectionMatch) {
    const sectionLabel = prefixedSectionMatch[1].toLowerCase()
    return parseCardLine(
      prefixedSectionMatch[2],
      sectionLabel === 'cmdr' || sectionLabel === 'commander'
        ? 'commander'
        : sectionLabel === 'sb' || sectionLabel === 'sideboard' || sectionLabel === 'maybeboard'
        ? 'sideboard'
        : currentSection
    )
  }

  if (!qtyMatch && !trailingQtyMatch) return null

  const quantity = Number(qtyMatch ? qtyMatch[1] : trailingQtyMatch?.[2] ?? 0)
  let rest = (qtyMatch ? qtyMatch[2] : trailingQtyMatch?.[1] ?? '').trim()

  let foil = false
  const finishMatch = rest.match(/\*(F|E)\*$/i)
  if (finishMatch) {
    foil = true
    rest = rest.replace(/\*(F|E)\*$/i, '').trim()
  }

  let setCode: string | undefined
  let collectorNumber: string | undefined

  // Match formats like:
  // Sol Ring (eoc) 57
  // Leonin Relic-Warder (plst) C17-65
  const printMatch = rest.match(/^(.*?)\s+\(([a-z0-9]+)\)\s+([\p{L}\p{N}\-★☆]+)$/iu)
  if (printMatch) {
    rest = printMatch[1].trim()
    setCode = printMatch[2].toLowerCase()
    collectorNumber = printMatch[3]
  }

  return {
    section: currentSection,
    quantity,
    cardName: rest,
    foil,
    setCode,
    collectorNumber,
  }
}

export function parseDeckText(input: string, sourceType = 'text'): ImportedDeckCard[] {
  const normalizedSourceType = sourceType.toLowerCase()

  if (normalizedSourceType === 'archidekt') {
    const archidektCards = parseArchidektTable(input)
    if (archidektCards.length > 0) {
      return archidektCards
    }
  }

  const lines = input.split('\n')

  let currentSection: 'commander' | 'mainboard' | 'sideboard' | 'token' = 'mainboard'
  const cards: ImportedDeckCard[] = []

  for (const raw of lines) {
    const line = normalizeLine(stripBulletPrefix(raw))
    if (!line) continue

    const lower = line.toLowerCase()

    if (lower === 'commander' || lower === 'commanders') {
      currentSection = 'commander'
      continue
    }

    if (
      lower === 'mainboard' ||
      lower === 'deck' ||
      lower === 'decklist' ||
      lower === '99' ||
      lower === '98' ||
      lower === 'maindeck'
    ) {
      currentSection = 'mainboard'
      continue
    }

    if (lower === 'tokens' || lower === 'token') {
      currentSection = 'token'
      continue
    }

    if (
      lower === 'sideboard' ||
      lower === 'maybeboard' ||
      lower === 'companion' ||
      lower === 'companions'
    ) {
      currentSection = 'sideboard'
      continue
    }

    const parsed = parseCardLine(line, currentSection)
    if (parsed) {
      if (
        normalizedSourceType === 'archidekt' &&
        currentSection === 'mainboard' &&
        isLikelyArchidektToken(parsed)
      ) {
        parsed.section = 'token'
      }

      cards.push(parsed)
    }
  }

  return cards
}
