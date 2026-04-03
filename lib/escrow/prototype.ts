export type SupportedCountry = 'ca' | 'us'

export type EscrowPrototypeInput = {
  deckAValue: number
  deckBValue: number
  countryA: SupportedCountry
  countryB: SupportedCountry
}

export type EscrowCheckoutSide = {
  deckValue: number
  shipping: number
  insurance: number
  matchingFee: number
  equalizationOwed: number
  amountDue: number
}

export type EscrowPrototypeResult = {
  lane: string
  supported: boolean
  notes: string[]
  deckA: EscrowCheckoutSide
  deckB: EscrowCheckoutSide
  equalizationRecipient: 'a' | 'b' | null
  equalizationAmount: number
  platformGross: number
}

function roundCurrency(value: number) {
  return Number(value.toFixed(2))
}

function matchingFeeForValue(value: number) {
  if (value < 150) {
    return roundCurrency(Math.max(4, value * 0.04))
  }

  if (value < 500) {
    return roundCurrency(Math.max(8, value * 0.05))
  }

  return roundCurrency(Math.max(20, value * 0.05))
}

function shippingForValue(value: number) {
  if (value < 150) return 15
  if (value < 500) return 20
  return 25
}

function insuranceForValue(value: number) {
  if (value < 150) return 3
  if (value < 500) return 6
  return 10
}

function laneLabel(countryA: SupportedCountry, countryB: SupportedCountry) {
  if (countryA === 'ca' && countryB === 'ca') return 'Canada to Canada'
  if (countryA === 'us' && countryB === 'us') return 'USA to USA'
  return 'Cross-border prototype lane'
}

export function calculateEscrowPrototype(
  input: EscrowPrototypeInput
): EscrowPrototypeResult {
  const supported = input.countryA === input.countryB
  const notes: string[] = []

  if (!supported) {
    notes.push('Cross-border trades are not priced in this prototype yet.')
  }

  if (Math.min(input.deckAValue, input.deckBValue) < 150) {
    notes.push(
      'Lower-value trades may need a reduced-fee lane because shipping and insurance become a larger share of the transaction.'
    )
  }

  if (Math.max(input.deckAValue, input.deckBValue) >= 500) {
    notes.push('Higher-value trades should require mandatory insurance and stronger inspection.')
  }

  const equalizationToA = Math.max(0, input.deckAValue - input.deckBValue)
  const equalizationToB = Math.max(0, input.deckBValue - input.deckAValue)

  const deckA: EscrowCheckoutSide = {
    deckValue: roundCurrency(input.deckAValue),
    shipping: shippingForValue(input.deckAValue),
    insurance: insuranceForValue(input.deckAValue),
    matchingFee: matchingFeeForValue(input.deckAValue),
    equalizationOwed: roundCurrency(equalizationToB),
    amountDue: 0,
  }

  const deckB: EscrowCheckoutSide = {
    deckValue: roundCurrency(input.deckBValue),
    shipping: shippingForValue(input.deckBValue),
    insurance: insuranceForValue(input.deckBValue),
    matchingFee: matchingFeeForValue(input.deckBValue),
    equalizationOwed: roundCurrency(equalizationToA),
    amountDue: 0,
  }

  deckA.amountDue = roundCurrency(
    deckA.shipping + deckA.insurance + deckA.matchingFee + deckA.equalizationOwed
  )
  deckB.amountDue = roundCurrency(
    deckB.shipping + deckB.insurance + deckB.matchingFee + deckB.equalizationOwed
  )

  return {
    lane: laneLabel(input.countryA, input.countryB),
    supported,
    notes,
    deckA,
    deckB,
    equalizationRecipient:
      equalizationToA > 0 ? 'a' : equalizationToB > 0 ? 'b' : null,
    equalizationAmount: roundCurrency(Math.max(equalizationToA, equalizationToB)),
    platformGross: roundCurrency(
      deckA.shipping +
        deckA.insurance +
        deckA.matchingFee +
        deckB.shipping +
        deckB.insurance +
        deckB.matchingFee
    ),
  }
}

export const ESCROW_EXAMPLES = [
  {
    slug: 'matched-premium',
    title: '$1000 for $1000',
    input: {
      deckAValue: 1000,
      deckBValue: 1000,
      countryA: 'ca' as const,
      countryB: 'ca' as const,
    },
  },
  {
    slug: 'downtrade-equalization',
    title: '$500 for $300',
    input: {
      deckAValue: 500,
      deckBValue: 300,
      countryA: 'us' as const,
      countryB: 'us' as const,
    },
  },
  {
    slug: 'low-value-trade',
    title: '$100 for $100',
    input: {
      deckAValue: 100,
      deckBValue: 100,
      countryA: 'ca' as const,
      countryB: 'ca' as const,
    },
  },
]
