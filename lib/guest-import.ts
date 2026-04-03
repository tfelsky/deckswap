export const GUEST_IMPORT_DRAFT_KEY = 'deckswap.guest-import-draft'
export const GUEST_IMPORT_DRAFT_BACKUP_KEY = 'deckswap.guest-import-draft-backup'
export const GUEST_IMPORT_SAVED_QUERY_KEY = 'guestSaved'
const GUEST_IMPORT_DRAFT_TTL_MS = 1000 * 60 * 60 * 24 * 14

export type GuestImportDraft = {
  deckName: string
  sourceType: string
  sourceUrl: string
  rawList: string
  updatedAt?: string
}

function canUseBrowserStorage() {
  return typeof window !== 'undefined'
}

function sanitizeDraft(draft: GuestImportDraft): GuestImportDraft {
  return {
    deckName: draft.deckName.trim(),
    sourceType: draft.sourceType.trim() || 'text',
    sourceUrl: draft.sourceUrl.trim(),
    rawList: draft.rawList.trim(),
    updatedAt: draft.updatedAt ?? new Date().toISOString(),
  }
}

function parseDraft(raw: string | null) {
  if (!raw) return null

  try {
    const parsed = sanitizeDraft(JSON.parse(raw) as GuestImportDraft)
    if (!parsed.deckName && !parsed.sourceUrl && !parsed.rawList) {
      return null
    }

    const updatedAt = parsed.updatedAt ? Date.parse(parsed.updatedAt) : NaN
    if (!Number.isNaN(updatedAt) && Date.now() - updatedAt > GUEST_IMPORT_DRAFT_TTL_MS) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export function saveGuestImportDraft(draft: GuestImportDraft) {
  if (!canUseBrowserStorage()) return

  const sanitized = sanitizeDraft({
    ...draft,
    updatedAt: new Date().toISOString(),
  })
  const serialized = JSON.stringify(sanitized)

  window.sessionStorage.setItem(GUEST_IMPORT_DRAFT_KEY, serialized)
  window.localStorage.setItem(GUEST_IMPORT_DRAFT_BACKUP_KEY, serialized)
}

export function readGuestImportDraft() {
  if (!canUseBrowserStorage()) return null

  const sessionDraft = parseDraft(window.sessionStorage.getItem(GUEST_IMPORT_DRAFT_KEY))
  if (sessionDraft) {
    return sessionDraft
  }

  const backupDraft = parseDraft(window.localStorage.getItem(GUEST_IMPORT_DRAFT_BACKUP_KEY))
  if (backupDraft) {
    window.sessionStorage.setItem(
      GUEST_IMPORT_DRAFT_KEY,
      JSON.stringify(backupDraft)
    )
    return backupDraft
  }

  return null
}

export function hasGuestImportDraft() {
  return !!readGuestImportDraft()
}

export function clearGuestImportDraft() {
  if (!canUseBrowserStorage()) return

  window.sessionStorage.removeItem(GUEST_IMPORT_DRAFT_KEY)
  window.localStorage.removeItem(GUEST_IMPORT_DRAFT_BACKUP_KEY)
}
