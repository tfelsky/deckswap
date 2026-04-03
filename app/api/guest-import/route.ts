import {
  isGuestImportSchemaMissing,
  type GuestImportDraft,
  type RemoteGuestImportDraft,
} from '@/lib/guest-import'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function mapDraftRowToDraft(
  row:
    | {
        resume_token: string
        deck_name: string | null
        source_type: string | null
        source_url: string | null
        raw_list: string | null
        updated_at: string | null
        created_at: string | null
        expires_at: string | null
      }
    | null
): RemoteGuestImportDraft | null {
  if (!row) return null

  return {
    draftToken: row.resume_token,
    deckName: row.deck_name ?? '',
    sourceType: row.source_type ?? 'text',
    sourceUrl: row.source_url ?? '',
    rawList: row.raw_list ?? '',
    updatedAt: row.updated_at ?? undefined,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const draftToken = searchParams.get('token')?.trim()

  if (!draftToken) {
    return NextResponse.json({ error: 'Missing guest draft token.' }, { status: 400 })
  }

  const supabase = await createClient()
  const result = await supabase.rpc('get_guest_import_draft', {
    p_resume_token: draftToken,
  })

  if (result.error) {
    return NextResponse.json(
      {
        error: isGuestImportSchemaMissing(result.error.message)
          ? 'Guest import persistence is not set up in Supabase yet.'
          : 'Failed to load guest draft.',
      },
      { status: isGuestImportSchemaMissing(result.error.message) ? 503 : 500 }
    )
  }

  const draft = mapDraftRowToDraft(result.data?.[0] ?? null)

  if (!draft) {
    return NextResponse.json({ draft: null }, { status: 404 })
  }

  return NextResponse.json({ draft })
}

export async function POST(request: Request) {
  const payload = (await request.json()) as GuestImportDraft
  const draftToken = payload.draftToken?.trim()

  if (!draftToken) {
    return NextResponse.json({ error: 'Missing guest draft token.' }, { status: 400 })
  }

  const supabase = await createClient()
  const result = await supabase.rpc('upsert_guest_import_draft', {
    p_resume_token: draftToken,
    p_deck_name: payload.deckName?.trim() ?? '',
    p_source_type: payload.sourceType?.trim() || 'text',
    p_source_url: payload.sourceUrl?.trim() ?? '',
    p_raw_list: payload.rawList?.trim() ?? '',
  })

  if (result.error) {
    return NextResponse.json(
      {
        error: isGuestImportSchemaMissing(result.error.message)
          ? 'Guest import persistence is not set up in Supabase yet.'
          : 'Failed to save guest draft.',
      },
      { status: isGuestImportSchemaMissing(result.error.message) ? 503 : 500 }
    )
  }

  const draft = mapDraftRowToDraft(result.data?.[0] ?? null)
  return NextResponse.json({ draft })
}
