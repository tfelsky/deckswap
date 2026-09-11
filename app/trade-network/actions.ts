'use server'

import { createNotification } from '@/lib/notifications'
import { createAdminClientOrNull } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  DEFAULT_MIN_ITEM_VALUE_USD,
  DEFAULT_MINIMUM_AGE_DAYS,
  isTradeNetworkSchemaMissing,
} from '@/lib/trade-network'
import type { WholesaleTurnoverProposal } from '@/lib/wholesale-turnover'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const RETURN_PATH = '/trade-network'

function numberField(value: FormDataEntryValue | null, fallback: number) {
  if (value == null || value === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function listField(value: FormDataEntryValue | null) {
  return String(value ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
}

export async function saveMembershipAction(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in?next=%2Ftrade-network')

  const { error } = await supabase.from('trade_network_memberships').upsert({
    user_id: user.id,
    enabled: formData.get('enabled') === 'on',
    display_name: String(formData.get('display_name') ?? '').trim() || null,
    country: String(formData.get('country') ?? '').trim() || null,
    min_item_value_usd: numberField(
      formData.get('min_item_value_usd'),
      DEFAULT_MIN_ITEM_VALUE_USD
    ),
    minimum_age_days: Math.floor(
      numberField(formData.get('minimum_age_days'), DEFAULT_MINIMUM_AGE_DAYS)
    ),
    wanted_categories: listField(formData.get('wanted_categories')),
    updated_at: new Date().toISOString(),
  })

  if (error && !isTradeNetworkSchemaMissing(error.message)) {
    console.error('Failed to save trade network membership:', error)
  }

  revalidatePath(RETURN_PATH)
  redirect(RETURN_PATH)
}

export async function requestLinkUpAction(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in?next=%2Ftrade-network')

  const counterpartyUserId = String(formData.get('counterparty_user_id') ?? '').trim()
  const message = String(formData.get('message') ?? '').trim() || null

  let proposal: WholesaleTurnoverProposal | null = null
  try {
    proposal = JSON.parse(String(formData.get('proposal') ?? '')) as WholesaleTurnoverProposal
  } catch {
    proposal = null
  }

  if (
    !counterpartyUserId ||
    counterpartyUserId === user.id ||
    !proposal ||
    (proposal.ownerAId !== user.id && proposal.ownerBId !== user.id) ||
    (proposal.ownerAId !== counterpartyUserId && proposal.ownerBId !== counterpartyUserId)
  ) {
    redirect(RETURN_PATH)
  }

  const { error } = await supabase.from('trade_network_linkups').insert({
    initiated_by_user_id: user.id,
    counterparty_user_id: counterpartyUserId,
    status: 'pending',
    message,
    proposal,
  })

  if (error) {
    if (!isTradeNetworkSchemaMissing(error.message)) {
      console.error('Failed to create trade network link-up:', error)
    }
  } else {
    // Notifications for another user need the admin client (RLS is owner-only).
    const admin = createAdminClientOrNull()
    if (admin) {
      await createNotification(admin, {
        userId: counterpartyUserId,
        actorUserId: user.id,
        type: 'trade_network_linkup_requested',
        title: 'New Trade Network link-up request',
        body: 'Another member wants to swap aged high-end inventory with you.',
        href: RETURN_PATH,
      })
    }
  }

  revalidatePath(RETURN_PATH)
  redirect(RETURN_PATH)
}

export async function respondLinkUpAction(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in?next=%2Ftrade-network')

  const linkupId = Number(formData.get('linkup_id'))
  const nextStatus = String(formData.get('next_status') ?? '')
  if (!Number.isFinite(linkupId) || !['accepted', 'declined', 'withdrawn'].includes(nextStatus)) {
    redirect(RETURN_PATH)
  }

  const { data: linkup, error: fetchError } = await supabase
    .from('trade_network_linkups')
    .select('id, initiated_by_user_id, counterparty_user_id, status')
    .eq('id', linkupId)
    .maybeSingle()

  if (fetchError || !linkup || linkup.status !== 'pending') {
    revalidatePath(RETURN_PATH)
    redirect(RETURN_PATH)
  }

  // Counterparty accepts/declines; the initiator can only withdraw.
  const isCounterparty = linkup.counterparty_user_id === user.id
  const isInitiator = linkup.initiated_by_user_id === user.id
  const allowed =
    (isCounterparty && (nextStatus === 'accepted' || nextStatus === 'declined')) ||
    (isInitiator && nextStatus === 'withdrawn')

  if (allowed) {
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('trade_network_linkups')
      .update({ status: nextStatus, responded_at: now, updated_at: now })
      .eq('id', linkupId)
      .eq('status', 'pending')

    if (error) {
      console.error('Failed to update trade network link-up:', error)
    } else if (isCounterparty) {
      const admin = createAdminClientOrNull()
      if (admin) {
        await createNotification(admin, {
          userId: linkup.initiated_by_user_id,
          actorUserId: user.id,
          type: `trade_network_linkup_${nextStatus}`,
          title: `Trade Network link-up ${nextStatus}`,
          body:
            nextStatus === 'accepted'
              ? 'Your link-up was accepted. Coordinate shipping details with your counterparty.'
              : 'Your link-up request was declined.',
          href: RETURN_PATH,
        })
      }
    }
  }

  revalidatePath(RETURN_PATH)
  redirect(RETURN_PATH)
}
