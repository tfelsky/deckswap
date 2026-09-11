// QShip — sell-side signals for cards a member already owns. Pure.
//
// Flags cards worth selling now (peaked, reprint incoming, buylists paying
// near retail) or trading in (dead weight), and quotes what QShip would pay
// as box credit. Nothing here sells anything: every action needs a tap.

import { estimateBuylistQuote } from '@/lib/arber/buylist'
import { roundUsd } from '@/lib/singles/pricing'
import { momentum } from './scoring'
import type { MarketSignal, PriceHistory } from './types'

export type SellSignalKind =
  | 'reprint_incoming'
  | 'peak'
  | 'buylist_spike'
  | 'dead_weight'
  | 'better_printing'

export type SellAction = 'sell_before_release' | 'list_or_trade_in' | 'trade_in' | 'trade_up'

export type OwnedCardInput = {
  sourceKind: 'single_inventory' | 'deck_card' | 'vault'
  sourceId: string
  cardName: string
  oracleId: string
  scryfallId?: string | null
  foil: boolean
  /** Copies held in this source row. */
  quantity: number
  priceUsd: number | null
  priceHistory?: PriceHistory | null
  buylistUsd?: number | null
  /** True when at least one copy sits in one of the member's decks. */
  inActiveDeck: boolean
  /** Copies across the member's whole collection, decks, and vault. */
  copiesOwned: number
  lastTouchedAt?: string | null
  signals?: MarketSignal[] | null
  /** A nicer printing available to swap into, when one is in stock. */
  upgradeOption?: { scryfallId: string; setName: string; priceUsd: number } | null
}

export type SellSignal = {
  kind: SellSignalKind
  action: SellAction
  headline: string
  detail: string
  source: Pick<OwnedCardInput, 'sourceKind' | 'sourceId' | 'cardName' | 'oracleId' | 'scryfallId'>
  marketPriceUsd: number
  /** Copies the signal applies to (keeps one copy when it's in a deck). */
  sellableQuantity: number
  tradeInCashUsd: number
  /** Cash quote plus the box-credit bonus, per copy. */
  tradeInCreditUsd: number
  /** Other signals the same card matched, lower priority. */
  alsoMatched: SellSignalKind[]
}

export const TRADE_IN_CREDIT_BONUS = 0.1
export const MIN_SELL_SIGNAL_PRICE_USD = 2

const PEAK_MOMENTUM_30D = 0.4
const PEAK_ROLLOVER_7D = 0.02
const BUYLIST_SPIKE_RATIO = 0.8
const DEAD_WEIGHT_IDLE_DAYS = 365
const UPGRADE_CREDIT_COVERAGE = 0.5
const DAY_MS = 24 * 60 * 60 * 1000

const PRIORITY: SellSignalKind[] = [
  'reprint_incoming',
  'peak',
  'buylist_spike',
  'dead_weight',
  'better_printing',
]

export function tradeInQuote(card: Pick<OwnedCardInput, 'cardName' | 'foil' | 'priceUsd' | 'buylistUsd'>) {
  const cash =
    card.buylistUsd != null && card.buylistUsd > 0
      ? roundUsd(card.buylistUsd)
      : estimateBuylistQuote({ cardName: card.cardName, marketPrice: card.priceUsd, foil: card.foil })
          ?.cashPrice ?? 0
  return { cash, credit: roundUsd(cash * (1 + TRADE_IN_CREDIT_BONUS)) }
}

function matchedKinds(card: OwnedCardInput, now: number): SellSignalKind[] {
  const price = card.priceUsd as number
  const history = card.priceHistory ?? {}
  const m7 = momentum(price, history.d7)
  const m30 = momentum(price, history.d30)
  const kinds: SellSignalKind[] = []

  if ((card.signals ?? []).some((signal) => signal.kind === 'reprint_risk')) kinds.push('reprint_incoming')
  if (m30 !== null && m30 >= PEAK_MOMENTUM_30D && m7 !== null && m7 <= PEAK_ROLLOVER_7D) kinds.push('peak')
  if (card.buylistUsd != null && card.buylistUsd >= price * BUYLIST_SPIKE_RATIO) kinds.push('buylist_spike')

  const lastTouched = card.lastTouchedAt ? Date.parse(card.lastTouchedAt) : NaN
  const idle = Number.isFinite(lastTouched) && now - lastTouched > DEAD_WEIGHT_IDLE_DAYS * DAY_MS
  if (!card.inActiveDeck && (card.copiesOwned >= 2 || idle)) kinds.push('dead_weight')

  if (card.upgradeOption && card.inActiveDeck) {
    const { credit } = tradeInQuote(card)
    if (credit >= card.upgradeOption.priceUsd * UPGRADE_CREDIT_COVERAGE) kinds.push('better_printing')
  }

  return PRIORITY.filter((kind) => kinds.includes(kind))
}

function describe(kind: SellSignalKind, card: OwnedCardInput): Pick<SellSignal, 'action' | 'headline' | 'detail'> {
  const history = card.priceHistory ?? {}
  const m30 = momentum(card.priceUsd, history.d30)
  switch (kind) {
    case 'reprint_incoming': {
      const signal = (card.signals ?? []).find((s) => s.kind === 'reprint_risk')
      return {
        action: 'sell_before_release',
        headline: `${card.cardName} is being reprinted`,
        detail: signal?.detail ?? 'It appears in upcoming-set spoilers; prices usually fall when the set releases.',
      }
    }
    case 'peak':
      return {
        action: 'list_or_trade_in',
        headline: `${card.cardName} may have peaked`,
        detail: `Up ${Math.round((m30 ?? 0) * 100)}% in 30 days, and flat or falling this week.`,
      }
    case 'buylist_spike':
      return {
        action: 'trade_in',
        headline: `Buylists are paying up for ${card.cardName}`,
        detail: 'Buylist cash is at least 80% of retail, which is rare. A strong moment to trade in.',
      }
    case 'dead_weight':
      return {
        action: 'trade_in',
        headline: `${card.cardName} isn't in any deck`,
        detail:
          card.copiesOwned >= 2
            ? `You own ${card.copiesOwned} copies and none are in a deck.`
            : 'Not in a deck and untouched for over a year.',
      }
    case 'better_printing':
      return {
        action: 'trade_up',
        headline: `Trade up to the ${card.upgradeOption?.setName ?? 'nicer'} printing`,
        detail: 'Your trade-in credit covers at least half of a nicer printing we have in stock.',
      }
  }
}

/** One signal per owned card (its highest-priority match), biggest value first. */
export function computeSellSignals(cards: OwnedCardInput[], now: Date = new Date()): SellSignal[] {
  const nowMs = now.getTime()
  const signals: SellSignal[] = []

  for (const card of cards) {
    if (card.priceUsd == null || card.priceUsd < MIN_SELL_SIGNAL_PRICE_USD) continue
    const kinds = matchedKinds(card, nowMs)
    if (kinds.length === 0) continue

    const [kind, ...rest] = kinds
    const { cash, credit } = tradeInQuote(card)
    const keepOne = card.inActiveDeck && card.sourceKind === 'deck_card' ? 1 : 0
    signals.push({
      kind,
      ...describe(kind, card),
      source: {
        sourceKind: card.sourceKind,
        sourceId: card.sourceId,
        cardName: card.cardName,
        oracleId: card.oracleId,
        scryfallId: card.scryfallId ?? null,
      },
      marketPriceUsd: roundUsd(card.priceUsd),
      sellableQuantity: Math.max(1, card.quantity - keepOne),
      tradeInCashUsd: cash,
      tradeInCreditUsd: credit,
      alsoMatched: rest,
    })
  }

  return signals.sort(
    (a, b) => b.marketPriceUsd * b.sellableQuantity - a.marketPriceUsd * a.sellableQuantity
  )
}
