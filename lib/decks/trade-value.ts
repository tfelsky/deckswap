function roundCurrency(value: number) {
  return Number(value.toFixed(2))
}

export function buylistRateForValue(value: number) {
  if (value < 150) return 0.58
  if (value < 500) return 0.62
  return 0.68
}

export function deckSwapFeeForValue(value: number) {
  if (value < 150) {
    return roundCurrency(Math.max(4, value * 0.04))
  }

  if (value < 500) {
    return roundCurrency(Math.max(8, value * 0.05))
  }

  return roundCurrency(Math.max(20, value * 0.05))
}

export function deckShippingForValue(value: number) {
  if (value < 150) return 15
  if (value < 500) return 20
  return 25
}

export function deckInsuranceForValue(value: number) {
  if (value < 150) return 3
  if (value < 500) return 6
  return 10
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
