const WUBRG_ORDER = ['W', 'U', 'B', 'R', 'G'] as const
const VALID_COLORS = new Set(WUBRG_ORDER)

type FilterDef = {
  code: string
  label: string
}

export const MONO_COLOR_FILTERS: FilterDef[] = [
  { code: 'C', label: 'Colorless' },
  { code: 'W', label: 'White' },
  { code: 'U', label: 'Blue' },
  { code: 'B', label: 'Black' },
  { code: 'R', label: 'Red' },
  { code: 'G', label: 'Green' },
]

export const PAIR_COLOR_FILTERS: FilterDef[] = [
  { code: 'WU', label: 'Azorius' },
  { code: 'UB', label: 'Dimir' },
  { code: 'BR', label: 'Rakdos' },
  { code: 'RG', label: 'Gruul' },
  { code: 'GW', label: 'Selesnya' },
  { code: 'WB', label: 'Orzhov' },
  { code: 'UR', label: 'Izzet' },
  { code: 'BG', label: 'Golgari' },
  { code: 'RW', label: 'Boros' },
  { code: 'GU', label: 'Simic' },
]

export const TRI_COLOR_FILTERS: FilterDef[] = [
  { code: 'WUB', label: 'Esper' },
  { code: 'UBR', label: 'Grixis' },
  { code: 'BRG', label: 'Jund' },
  { code: 'RGW', label: 'Naya' },
  { code: 'GWU', label: 'Bant' },
  { code: 'WBG', label: 'Abzan' },
  { code: 'URW', label: 'Jeskai' },
  { code: 'BGU', label: 'Sultai' },
  { code: 'RWB', label: 'Mardu' },
  { code: 'GUR', label: 'Temur' },
]

export const FOUR_COLOR_FILTERS: FilterDef[] = [
  { code: 'WUBR', label: 'No Green' },
  { code: 'UBRG', label: 'No White' },
  { code: 'BRGW', label: 'No Blue' },
  { code: 'RGWU', label: 'No Black' },
  { code: 'GWUB', label: 'No Red' },
]

export const FIVE_COLOR_FILTERS: FilterDef[] = [
  { code: 'WUBRG', label: 'Five-Color' },
]

export const ALL_COLOR_FILTERS = [
  ...MONO_COLOR_FILTERS,
  ...PAIR_COLOR_FILTERS,
  ...TRI_COLOR_FILTERS,
  ...FOUR_COLOR_FILTERS,
  ...FIVE_COLOR_FILTERS,
]

export function normalizeColorIdentity(value: string[] | null | undefined) {
  const deduped = new Set<string>()

  for (const color of value ?? []) {
    const normalized = color.trim().toUpperCase()
    if (VALID_COLORS.has(normalized as (typeof WUBRG_ORDER)[number])) {
      deduped.add(normalized)
    }
  }

  return WUBRG_ORDER.filter((color) => deduped.has(color))
}

export function colorIdentityCode(value: string[] | null | undefined) {
  const normalized = normalizeColorIdentity(value)
  return normalized.length > 0 ? normalized.join('') : 'C'
}

export function getColorIdentityLabel(value: string[] | null | undefined) {
  const code = colorIdentityCode(value)
  const match = ALL_COLOR_FILTERS.find((filter) => filter.code === code)
  return match ? match.label : code
}

export function deriveDeckColorIdentity(
  cards: Array<{
    section: 'commander' | 'mainboard' | 'token'
    color_identity?: string[] | null
  }>
) {
  const sourceCards = cards.some((card) => card.section === 'commander')
    ? cards.filter((card) => card.section === 'commander')
    : cards.filter((card) => card.section !== 'token')

  const colors = new Set<string>()
  for (const card of sourceCards) {
    for (const color of normalizeColorIdentity(card.color_identity)) {
      colors.add(color)
    }
  }

  return WUBRG_ORDER.filter((color) => colors.has(color))
}
