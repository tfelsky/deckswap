import { normalizeDeckFormat } from '@/lib/decks/formats'
import type { ImportedDeckCard } from './types'

function hasKeyword(card: ImportedDeckCard, keyword: string) {
  return (card.keywords ?? []).some(
    (k) => k.toLowerCase() === keyword.toLowerCase()
  )
}

function isBasicLand(cardName: string) {
  const basics = new Set([
    'plains',
    'island',
    'swamp',
    'mountain',
    'forest',
    'wastes',
  ])

  return basics.has(cardName.toLowerCase())
}

function toSectionCounts(cards: ImportedDeckCard[]) {
  const commanders = cards.filter((c) => c.section === 'commander')
  const mainboardCards = cards.filter((c) => c.section === 'mainboard')
  const sideboardCards = cards.filter((c) => c.section === 'sideboard')
  const tokenCards = cards.filter((c) => c.section === 'token')

  return {
    commanders,
    mainboardCards,
    sideboardCards,
    commanderCount: commanders.reduce((sum, c) => sum + c.quantity, 0),
    mainboardCount: mainboardCards.reduce((sum, c) => sum + c.quantity, 0),
    sideboardCount: sideboardCards.reduce((sum, c) => sum + c.quantity, 0),
    tokenCount: tokenCards.reduce((sum, c) => sum + c.quantity, 0),
  }
}

function validateSixtyCardConstructedDeck(
  cards: ImportedDeckCard[],
  formatLabel: string
) {
  const { commanders, mainboardCards, sideboardCards, commanderCount, mainboardCount, sideboardCount, tokenCount } =
    toSectionCounts(cards)

  const errors: string[] = []

  if (commanderCount > 0) {
    errors.push(`${formatLabel} decks should not include a commander section.`)
  }

  if (mainboardCount === 0) {
    errors.push('Deck must include at least one mainboard card.')
  }

  if (mainboardCount < 60) {
    errors.push(`${formatLabel} decks usually need at least 60 mainboard cards, found ${mainboardCount}.`)
  }

  if (sideboardCount > 15) {
    errors.push(`${formatLabel} sideboards can include up to 15 cards, found ${sideboardCount}.`)
  }

  const nameCounts = new Map<string, number>()

  for (const card of [...mainboardCards, ...sideboardCards]) {
    const key = card.cardName.trim().toLowerCase()
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + card.quantity)
  }

  for (const [name, qty] of nameCounts.entries()) {
    if (qty > 4 && !isBasicLand(name)) {
      errors.push(`Too many copies for ${name}: ${qty}. Standard-style decks usually allow up to 4 between mainboard and sideboard.`)
    }
  }

  return {
    isValid: errors.length === 0,
    commanderCount,
    mainboardCount,
    sideboardCount,
    tokenCount,
    commanderMode: commanders.length > 0 ? 'single' : 'invalid',
    errors,
  }
}

function validateCommanderColorIdentity(cards: ImportedDeckCard[]) {
  const commanders = cards.filter((card) => card.section === 'commander')
  const allowedColors = new Set<string>()

  for (const commander of commanders) {
    for (const color of commander.colorIdentity ?? []) {
      allowedColors.add(color.toUpperCase())
    }
  }

  if (allowedColors.size === 0) {
    return [] as string[]
  }

  const errors: string[] = []

  for (const card of cards.filter((c) => c.section === 'mainboard')) {
    const outsideIdentity = (card.colorIdentity ?? []).filter(
      (color) => !allowedColors.has(color.toUpperCase())
    )

    if (outsideIdentity.length > 0) {
      errors.push(
        `Color identity mismatch: ${card.cardName} includes ${outsideIdentity.join(
          ', '
        )} outside the commander identity.`
      )
    }
  }

  return errors
}

function isLegalCommanderPair(a: ImportedDeckCard, b: ImportedDeckCard) {
  const aPartner =
    hasKeyword(a, 'Partner') ||
    hasKeyword(a, 'Friends forever') ||
    hasKeyword(a, "Doctor's companion")

  const bPartner =
    hasKeyword(b, 'Partner') ||
    hasKeyword(b, 'Friends forever') ||
    hasKeyword(b, "Doctor's companion")

  const partnerWithMatch =
    !!a.partnerWithName &&
    a.partnerWithName.toLowerCase() === b.cardName.toLowerCase()

  const reversePartnerWithMatch =
    !!b.partnerWithName &&
    b.partnerWithName.toLowerCase() === a.cardName.toLowerCase()

  const backgroundPair =
    (hasKeyword(a, 'Choose a Background') && b.isBackground) ||
    (hasKeyword(b, 'Choose a Background') && a.isBackground)

  if (partnerWithMatch || reversePartnerWithMatch) {
    return { valid: true, mode: 'partner_with_pair' as const }
  }

  if (backgroundPair) {
    return { valid: true, mode: 'background_pair' as const }
  }

  if (aPartner && bPartner) {
    return { valid: true, mode: 'partner_pair' as const }
  }

  return { valid: false, mode: 'invalid' as const }
}

export function validateCommanderDeck(cards: ImportedDeckCard[]) {
  const { commanders, mainboardCards, sideboardCount, commanderCount, mainboardCount, tokenCount } =
    toSectionCounts(cards)
  const nonTokenCards = cards.filter((c) => c.section !== 'token' && c.section !== 'sideboard')

  const errors: string[] = []
  let commanderMode:
    | 'single'
    | 'partner_pair'
    | 'partner_with_pair'
    | 'background_pair'
    | 'invalid' = 'invalid'

  if (commanderCount === 1) {
    commanderMode = 'single'

    if (mainboardCount !== 99) {
      errors.push(
        `Single-commander deck must have 99 maindeck cards, found ${mainboardCount}.`
      )
    }
  } else if (commanderCount === 2) {
    const pair = isLegalCommanderPair(commanders[0], commanders[1])
    commanderMode = pair.mode

    if (!pair.valid) {
      errors.push(
        'Two-commanders submitted, but the pair is not a legal Commander pairing.'
      )
    }

    if (mainboardCount !== 98) {
      errors.push(
        `Two-commander deck must have 98 maindeck cards, found ${mainboardCount}.`
      )
    }
  } else {
    errors.push(`Deck must have 1 or 2 commanders, found ${commanderCount}.`)
  }

  if (sideboardCount > 0) {
    errors.push(`Commander imports should not include a sideboard section, found ${sideboardCount} sideboard cards.`)
  }

  const nameCounts = new Map<string, number>()

  for (const card of nonTokenCards) {
    const key = card.cardName.toLowerCase()
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + card.quantity)
  }

  for (const [name, qty] of nameCounts.entries()) {
    if (qty > 1 && !isBasicLand(name)) {
      errors.push(`Duplicate card detected: ${name} x${qty}`)
    }
  }

  errors.push(...validateCommanderColorIdentity(cards))

  return {
    isValid: errors.length === 0,
    commanderCount,
    mainboardCount,
    sideboardCount,
    tokenCount,
    commanderMode,
    errors,
  }
}

export function validateDeckForFormat(
  cards: ImportedDeckCard[],
  format: string | null | undefined
) {
  const normalizedFormat = normalizeDeckFormat(format)

  if (normalizedFormat === 'commander') {
    return validateCommanderDeck(cards)
  }

  if (normalizedFormat === 'standard') {
    return validateSixtyCardConstructedDeck(cards, 'Standard')
  }

  const { commanders, commanderCount, mainboardCount, sideboardCount, tokenCount } =
    toSectionCounts(cards)

  const errors: string[] = []

  if (mainboardCount === 0 && sideboardCount === 0) {
    errors.push('Deck must include at least one non-token card.')
  }

  if (
    ['standard', 'modern', 'legacy', 'premodern', 'pauper'].includes(
      normalizedFormat
    ) &&
    mainboardCount < 60
  ) {
    errors.push(
      `${normalizedFormat[0].toUpperCase()}${normalizedFormat.slice(
        1
      )} decks usually need at least 60 cards, found ${mainboardCount}.`
    )
  }

  if (normalizedFormat === 'canlander' && mainboardCount !== 100) {
    errors.push(`Canadian Highlander decks usually contain 100 cards, found ${mainboardCount}.`)
  }

  return {
    isValid: errors.length === 0,
    commanderCount,
    mainboardCount,
    sideboardCount,
    tokenCount,
    commanderMode: commanders.length > 0 ? 'single' : 'invalid',
    errors,
  }
}
