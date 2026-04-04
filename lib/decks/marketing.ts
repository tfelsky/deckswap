export type DeckMarketingFields = {
  is_sleeved?: boolean | null
  is_boxed?: boolean | null
  is_sealed?: boolean | null
  is_complete_precon?: boolean | null
  box_type?: string | null
}

export function normalizeBoxType(value: string | null | undefined) {
  const normalized = (value ?? '').trim().replace(/\s+/g, ' ')
  return normalized ? normalized.slice(0, 40) : null
}

export function getDeckMarketingChips(deck: DeckMarketingFields) {
  const chips: string[] = []

  if (deck.is_sleeved === true) chips.push('Sleeved')
  else if (deck.is_sleeved === false) chips.push('Unsleeved')

  if (deck.is_boxed === true) chips.push('Boxed')
  else if (deck.is_boxed === false) chips.push('Unboxed')

  if (deck.is_sealed === true) chips.push('Sealed')
  if (deck.is_complete_precon === true) chips.push('Complete Precon')

  const boxType = normalizeBoxType(deck.box_type)
  if (deck.is_boxed && boxType) {
    chips.push(boxType)
  }

  return chips
}
