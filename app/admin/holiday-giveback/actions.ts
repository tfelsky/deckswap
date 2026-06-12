'use server'

import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin/access'
import { sendUserTransactionalEmailById } from '@/lib/email-events'
import { createNotification } from '@/lib/notifications'
import { createAdminClientOrNull } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const HOLIDAY_STATUSES = ['holiday_pending_receipt', 'holiday_received', 'holiday_placed'] as const

type HolidayStatus = (typeof HOLIDAY_STATUSES)[number]

export async function updateHolidayDonationAction(formData: FormData) {
  const { supabase, user } = await requireAdmin()
  const adminSupabase = createAdminClientOrNull() ?? supabase ?? (await createClient())
  const deckId = Number(formData.get('deck_id'))
  const nextStatus = String(formData.get('next_status') || '').trim() as HolidayStatus
  const adminNotes = String(formData.get('admin_notes') || '').trim()

  if (!Number.isFinite(deckId) || deckId <= 0 || !HOLIDAY_STATUSES.includes(nextStatus)) {
    redirect('/admin/holiday-giveback')
  }

  const { data: deck } = await adminSupabase
    .from('decks')
    .select('id, name, user_id, inventory_status')
    .eq('id', deckId)
    .maybeSingle()

  if (!deck || !HOLIDAY_STATUSES.includes(String(deck.inventory_status) as HolidayStatus)) {
    redirect('/admin/holiday-giveback')
  }

  const now = new Date().toISOString()
  const payload: Record<string, unknown> = {
    inventory_status: nextStatus,
    holiday_admin_notes: adminNotes || null,
  }

  if (nextStatus === 'holiday_received' && deck.inventory_status !== 'holiday_received') {
    payload.holiday_received_at = now
  }
  if (nextStatus === 'holiday_placed' && deck.inventory_status !== 'holiday_placed') {
    payload.holiday_placed_at = now
  }

  // Retry without columns the schema does not have yet (notes/timestamps ship
  // behind a hand-applied migration); inventory_status always persists.
  let nextPayload = { ...payload }
  while (Object.keys(nextPayload).length > 0) {
    const { error } = await adminSupabase.from('decks').update(nextPayload).eq('id', deckId)
    if (!error) break

    const match = String(error.message ?? '').match(
      /Could not find the '([^']+)' column|column "([^"]+)" of relation/i
    )
    const missingColumn = match?.[1] ?? match?.[2]
    if (!missingColumn || !(missingColumn in nextPayload)) {
      throw new Error(error.message)
    }
    delete nextPayload[missingColumn]
  }

  const statusChanged = deck.inventory_status !== nextStatus

  if (statusChanged && deck.user_id && nextStatus !== 'holiday_pending_receipt') {
    const received = nextStatus === 'holiday_received'
    const title = received
      ? 'Your holiday donation arrived'
      : 'Your holiday donation found a home'
    const body = received
      ? `"${deck.name}" was received by the Mythiverse Exchange Holiday program. Thank you!`
      : `"${deck.name}" has been placed with a holiday program recipient. Thank you for the donation!`

    await createNotification(adminSupabase, {
      userId: deck.user_id,
      actorUserId: user.id,
      type: received ? 'holiday_donation_received' : 'holiday_donation_placed',
      title,
      body,
      href: `/my-decks/${deckId}`,
      metadata: { deckId },
    })

    try {
      await sendUserTransactionalEmailById({
        userId: deck.user_id,
        subject: title,
        body,
        href: `/my-decks/${deckId}`,
        ctaLabel: 'View your deck',
        idempotencyKey: `holiday-${nextStatus}:${deckId}`,
        eyebrow: 'Holiday Giveback',
      })
    } catch (error) {
      console.error('Failed to send holiday donation email:', error)
    }
  }

  redirect('/admin/holiday-giveback?updated=1')
}
