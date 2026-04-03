export const CARD_CONDITIONS = [
  'damaged',
  'heavy_play',
  'moderate_play',
  'light_play',
  'near_mint',
] as const

export type CardCondition = (typeof CARD_CONDITIONS)[number]

export const CARD_CONDITION_DETAILS: Record<
  CardCondition,
  { label: string; shortLabel: string; description: string }
> = {
  damaged: {
    label: 'Damaged',
    shortLabel: 'DMG',
    description:
      'Visible creasing, water exposure, ink wear, peeling, or other major issues that materially affect presentation or playability.',
  },
  heavy_play: {
    label: 'Heavy Play',
    shortLabel: 'HP',
    description:
      'Strong whitening, surface wear, scuffs, or edge damage that is obvious at a glance but the card is still sleeve-playable.',
  },
  moderate_play: {
    label: 'Moderate Play',
    shortLabel: 'MP',
    description:
      'Noticeable edge wear or surface marks under normal handling, but no major structural damage or severe creasing.',
  },
  light_play: {
    label: 'Light Play',
    shortLabel: 'LP',
    description:
      'Minor edge wear or faint surface marks with overall clean presentation and no major defects.',
  },
  near_mint: {
    label: 'Near Mint',
    shortLabel: 'NM',
    description:
      'Clean front and back with only minimal handling wear, appropriate for premium listings and close inspection.',
  },
}

export function normalizeCardCondition(value: string | null | undefined): CardCondition {
  const normalized = (value ?? '').trim().toLowerCase()
  return CARD_CONDITIONS.includes(normalized as CardCondition)
    ? (normalized as CardCondition)
    : 'near_mint'
}

export function getCardConditionMeta(value: string | null | undefined) {
  const condition = normalizeCardCondition(value)
  return CARD_CONDITION_DETAILS[condition]
}
