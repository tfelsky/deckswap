import { NextResponse } from 'next/server'

import { createAdminClientOrNull } from '@/lib/supabase/admin'
import { collectTrackedScryfallIds } from '@/lib/qship/data'
import { snapshotPrices } from '@/lib/qship/providers/scryfall'

// 60s is the highest duration every Vercel plan accepts; a larger value fails
// the deployment on Hobby projects without Fluid Compute.
export const maxDuration = 60

function isAuthorized(request: Request) {
  const authHeader = request.headers.get('authorization')?.trim()
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  const cronSecret = process.env.CRON_SECRET?.trim()

  return !!cronSecret && bearer === cronSecret
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClientOrNull()
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY is not configured.' },
      { status: 500 }
    )
  }

  try {
    const ids = await collectTrackedScryfallIds(admin)
    const result = await snapshotPrices(admin, ids)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'QShip price snapshot failed.',
      },
      { status: 500 }
    )
  }
}
