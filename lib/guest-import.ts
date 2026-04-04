export const GUEST_IMPORT_DRAFT_KEY = 'deckswap.guest-import-draft'
export const GUEST_IMPORT_DRAFT_BACKUP_KEY = 'deckswap.guest-import-draft-backup'
export const GUEST_IMPORT_SAVED_QUERY_KEY = 'guestSaved'
export const GUEST_IMPORT_DRAFT_QUERY_KEY = 'guestDraft'
const GUEST_IMPORT_DRAFT_TTL_MS = 1000 * 60 * 60 * 24 * 14

export type GuestImportDraft = {
  draftToken?: string
  deckName: string
  sourceType: string
  sourceUrl: string
  rawList: string
  updatedAt?: string
}

export type RemoteGuestImportDraft = GuestImportDraft & {
  createdAt?: string | null
  expiresAt?: string | null
}

function canUseBrowserStorage() {
  return typeof window !== 'undefined'
}

function sanitizeDraft(draft: GuestImportDraft): GuestImportDraft {
  return {
    draftToken: draft.draftToken?.trim() || undefined,
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

export function isGuestImportSchemaMissing(message?: string | null) {
  if (!message) return false

  return (
    message.includes("relation 'public.guest_import_drafts'") ||
    message.includes('relation "public.guest_import_drafts"') ||
    message.includes("Could not find the relation 'public.guest_import_drafts'") ||
    message.includes("function public.upsert_guest_import_draft") ||
    message.includes('function public.upsert_guest_import_draft') ||
    message.includes("function public.get_guest_import_draft") ||
    message.includes('function public.get_guest_import_draft') ||
    message.includes("function public.claim_guest_import_draft") ||
    message.includes('function public.claim_guest_import_draft')
  )
}

export function createGuestImportDraftToken() {
  if (
    typeof globalThis !== 'undefined' &&
    'crypto' in globalThis &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID()
  }

  return `guest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function ensureGuestImportDraftToken(draft: GuestImportDraft) {
  return draft.draftToken?.trim() ? draft.draftToken : createGuestImportDraftToken()
}

export async function syncGuestImportDraftRemote(draft: GuestImportDraft) {
  const payload = sanitizeDraft({
    ...draft,
    draftToken: ensureGuestImportDraftToken(draft),
  })

  const response = await fetch('/api/guest-import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    if (response.status >= 500) {
      throw new Error('Guest draft save is temporarily unavailable. Your local draft is still safe in this browser.')
    }

    throw new Error('Could not save the guest draft online right now. Your local draft is still safe in this browser.')
  }

  return (await response.json()) as {
    draft: RemoteGuestImportDraft
  }
}

export async function fetchGuestImportDraftRemote(draftToken: string) {
  const response = await fetch(
    `/api/guest-import?token=${encodeURIComponent(draftToken)}`,
    {
      method: 'GET',
      cache: 'no-store',
    }
  )

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    if (response.status >= 500) {
      throw new Error('Saved guest draft is temporarily unavailable online. You can still continue with any local draft saved in this browser.')
    }

    throw new Error('Could not load that saved guest draft online. If you started this draft in another browser or device, reopen it there and try again.')
  }

  const payload = (await response.json()) as {
    draft: RemoteGuestImportDraft | null
  }

  return payload.draft
}
