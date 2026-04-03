export const GUEST_IMPORT_DRAFT_KEY = 'deckswap.guest-import-draft'
export const GUEST_IMPORT_SAVED_QUERY_KEY = 'guestSaved'

export type GuestImportDraft = {
  deckName: string
  sourceType: string
  sourceUrl: string
  rawList: string
}
