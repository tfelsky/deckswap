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
  const commanders = cards.filter((c) => c.section === 'commander')

  const mainboardCards = cards.filter((c) => c.section === 'mainboard')
  const nonTokenCards = cards.filter((c) => c.section !== 'token')

  const mainboardCount = mainboardCards.reduce((sum, c) => sum + c.quantity, 0)

  const tokenCount = cards
    .filter((c) => c.section === 'token')
    .reduce((sum, c) => sum + c.quantity, 0)

  const errors: string[] = []
  let commanderMode:
    | 'single'
    | 'partner_pair'
    | 'partner_with_pair'
    | 'background_pair'
    | 'invalid' = 'invalid'

  if (commanders.length === 1) {
    commanderMode = 'single'

    if (mainboardCount !== 99) {
      errors.push(
        `Single-commander deck must have 99 maindeck cards, found ${mainboardCount}.`
      )
    }
  } else if (commanders.length === 2) {
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
    errors.push(`Deck must have 1 or 2 commanders, found ${commanders.length}.`)
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

  return {
    isValid: errors.length === 0,
    commanderCount: commanders.length,
    mainboardCount,
    tokenCount,
    commanderMode,
    errors,
  }
}