export type AuctionFormat = 'reserve' | 'no_reserve'
export type AuctionDuration = 3 | 5 | 7

export type AuctionPrototypeInput = {
  deckValue: number
  format: AuctionFormat
  reservePrice: number
  durationDays: AuctionDuration
}

export type AuctionPrototypeResult = {
  deckValue: number
  format: AuctionFormat
  reservePrice: number
  durationDays: AuctionDuration
  estimatedWinningBid: number
  sellerFee: number
  payoutBeforeShipping: number
  suggestedStartingBid: number
  notes: string[]
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

export function calculateAuctionPrototype(
  input: AuctionPrototypeInput
): AuctionPrototypeResult {
  const deckValue = Math.max(0, input.deckValue)
  const sellerFeeRate = 0.08

  const bidMultiplier =
    input.format === 'no_reserve'
      ? input.durationDays >= 7
        ? 0.92
        : input.durationDays >= 5
          ? 0.89
          : 0.86
      : input.durationDays >= 7
        ? 0.97
        : input.durationDays >= 5
          ? 0.95
          : 0.92

  const estimatedWinningBid = roundMoney(
    input.format === 'no_reserve'
      ? deckValue * bidMultiplier
      : Math.max(input.reservePrice, deckValue * bidMultiplier)
  )
  const sellerFee = roundMoney(estimatedWinningBid * sellerFeeRate)
  const payoutBeforeShipping = roundMoney(estimatedWinningBid - sellerFee)
  const suggestedStartingBid = roundMoney(
    input.format === 'no_reserve'
      ? Math.max(1, deckValue * 0.35)
      : Math.max(1, input.reservePrice * 0.7)
  )

  const notes: string[] = []

  if (input.format === 'no_reserve') {
    notes.push('No-reserve auctions are the fastest way to move a deck, but they can settle below the current blended deck value.')
  } else {
    notes.push('Reserve auctions protect the seller from a weak closing price, but a higher reserve can reduce bidding momentum.')
  }

  if (input.durationDays <= 3) {
    notes.push('A shorter auction window favors urgency and quicker liquidation over maximum exposure.')
  } else {
    notes.push('A longer auction window gives the listing more time to collect watchers and competitive bidding.')
  }

  if (input.format === 'reserve' && input.reservePrice > deckValue) {
    notes.push('This reserve is above the current estimated value, so the auction may fail to clear unless demand is unusually strong.')
  }

  if (payoutBeforeShipping < deckValue * 0.8) {
    notes.push('Expected payout is materially below blended deck value, which may still be acceptable when speed matters more than maximizing proceeds.')
  }

  return {
    deckValue,
    format: input.format,
    reservePrice: roundMoney(clamp(input.reservePrice, 0, deckValue * 2)),
    durationDays: input.durationDays,
    estimatedWinningBid,
    sellerFee,
    payoutBeforeShipping,
    suggestedStartingBid,
    notes,
  }
}
