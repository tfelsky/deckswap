import type { ImportedDeckCard } from './types'

type DeckCardLike = {
  id: number
  section: 'commander' | 'mainboard' | 'sideboard'
  quantity: number
  card_name: string
}

export function normalizeImportedCommanderOverlap(cards: ImportedDeckCard[]) {
  const remainingCommanderCopies = new Map<string, number>()

  for (const card of cards) {
    if (card.section !== 'commander') continue

    const key = card.cardName.trim().toLowerCase()
    remainingCommanderCopies.set(
      key,
      (remainingCommanderCopies.get(key) ?? 0) + card.quantity
    )
  }

  return cards
    .map((card) => {
      if (card.section !== 'mainboard') {
        return card
      }

      const key = card.cardName.trim().toLowerCase()
      const overlap = remainingCommanderCopies.get(key) ?? 0

      if (overlap <= 0) {
        return card
      }

      const nextQuantity = card.quantity - Math.min(card.quantity, overlap)
      remainingCommanderCopies.set(key, Math.max(0, overlap - card.quantity))

      if (nextQuantity <= 0) {
        return null
      }

      return {
        ...card,
        quantity: nextQuantity,
      }
    })
    .filter((card): card is ImportedDeckCard => !!card)
}

export function planCommanderOverlapRowFixes(cards: DeckCardLike[]) {
  const remainingCommanderCopies = new Map<string, number>()

  for (const card of cards) {
    if (card.section !== 'commander') continue

    const key = card.card_name.trim().toLowerCase()
    remainingCommanderCopies.set(
      key,
      (remainingCommanderCopies.get(key) ?? 0) + card.quantity
    )
  }

  const updates: Array<{ id: number; quantity: number }> = []
  const deletes: number[] = []

  for (const card of cards) {
    if (card.section !== 'mainboard') continue

    const key = card.card_name.trim().toLowerCase()
    const overlap = remainingCommanderCopies.get(key) ?? 0

    if (overlap <= 0) {
      continue
    }

    const consumed = Math.min(card.quantity, overlap)
    const nextQuantity = card.quantity - consumed
    remainingCommanderCopies.set(key, overlap - consumed)

    if (nextQuantity <= 0) {
      deletes.push(card.id)
    } else {
      updates.push({ id: card.id, quantity: nextQuantity })
    }
  }

  return {
    hasFixes: updates.length > 0 || deletes.length > 0,
    updates,
    deletes,
  }
}
