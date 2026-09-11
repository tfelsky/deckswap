import { NextResponse } from 'next/server'

import { createNotification } from '@/lib/notifications'
import { createAdminClientOrNull } from '@/lib/supabase/admin'
import type { SinglesMailSlotRow } from '@/lib/singles/mail-slots'

// Settles mail slots whose paid hold has run out: charges the one combined
// shipment, moves the slot to ready_to_ship, and tells both sides. Sellers can
// also ship a lapsed slot directly, so this is the nudge, not the only way out.

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

  const adminSupabase = createAdminClientOrNull()
  if (!adminSupabase) {
    return NextResponse.json(
      { ok: false, error: 'Supabase admin access is not configured.' },
      { status: 500 }
    )
  }

  const lapsedResult = await adminSupabase
    .from('singles_mail_slots')
    .select('id, buyer_user_id, seller_user_id')
    .eq('status', 'open')
    .lte('held_until', new Date().toISOString())
    .order('held_until', { ascending: true })
    .limit(200)

  if (lapsedResult.error) {
    return NextResponse.json({ ok: false, error: lapsedResult.error.message }, { status: 500 })
  }

  let released = 0
  const failures: { mailSlotId: number; error: string }[] = []

  for (const slot of (lapsedResult.data ?? []) as Pick<
    SinglesMailSlotRow,
    'id' | 'buyer_user_id' | 'seller_user_id'
  >[]) {
    const result = await adminSupabase.rpc('release_singles_mail_slot', { p_slot_id: slot.id })

    if (result.error) {
      failures.push({ mailSlotId: slot.id, error: result.error.message })
      continue
    }

    released += 1
    const href = `/singles-orders/slots/${slot.id}`
    const metadata = { mailSlotId: slot.id, reason: 'hold_expired' }

    await createNotification(adminSupabase, {
      userId: slot.seller_user_id,
      type: 'singles_mail_slot_ready_to_ship',
      title: 'A mail slot is ready to ship',
      body: `The paid hold on mail slot #${slot.id} ended. Pack every order in it into one shipment.`,
      href,
      metadata,
    })
    await createNotification(adminSupabase, {
      userId: slot.buyer_user_id,
      type: 'singles_mail_slot_hold_ended',
      title: 'Your mail slot is shipping',
      body: `The hold on mail slot #${slot.id} ended, so the seller will ship everything in it together.`,
      href,
      metadata,
    })
  }

  return NextResponse.json({ ok: failures.length === 0, released, failures })
}
