function roundCurrency(value: number) {
  return Number(value.toFixed(2))
}

export function buylistRateForValue(value: number) {
  if (value < 150) return 0.35
  if (value < 500) return 0.42
  return 0.5
}

export function deckSwapFeeForValue(value: number) {
  if (value < 150) {
    return roundCurrency(Math.max(6, value * 0.06))
  }

  if (value < 500) {
    return roundCurrency(Math.max(12, value * 0.07))
  }

  return roundCurrency(Math.max(28, value * 0.08))
}

export function deckShippingForValue(value: number) {
  if (value < 150) return 18
  if (value < 500) return 24
  return 30
}

export function deckInsuranceForValue(value: number) {
  if (value < 150) return 4
  if (value < 500) return 8
  return 12
}

export function calculateDeckTradeValue(value: number) {
  const deckValue = roundCurrency(Math.max(0, value))
  const buylistRate = buylistRateForValue(deckValue)
  const buylistValue = roundCurrency(deckValue * buylistRate)
  const fee = deckSwapFeeForValue(deckValue)
  const shipping = deckShippingForValue(deckValue)
  const insurance = deckInsuranceForValue(deckValue)
  const deckSwapValue = roundCurrency(Math.max(0, deckValue - fee - shipping - insurance))
  const extraVsBuylist = roundCurrency(Math.max(0, deckSwapValue - buylistValue))

  return {
    deckValue,
    buylistRate,
    buylistValue,
    fee,
    shipping,
    insurance,
    deckSwapValue,
    extraVsBuylist,
  }
}
