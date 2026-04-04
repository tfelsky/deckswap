export type ImportedDeckCard = {
  section: 'commander' | 'mainboard' | 'sideboard' | 'token'
  quantity: number
  cardName: string
  foil?: boolean
  setCode?: string
  setName?: string
  collectorNumber?: string
  isLegendary?: boolean
  isBackground?: boolean
  canBeCommander?: boolean
  keywords?: string[]
  partnerWithName?: string | null
  colorIdentity?: string[]
}
