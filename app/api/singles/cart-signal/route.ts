import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { awardEngagementPoints } from '@/lib/rewards/award'
import { ENGAGEMENT_RULES } from '@/lib/rewards/engagement'

// Awards Spark (engagement points) when a shopper first adds a listing to their cart.
// The cart lives in client localStorage, so this is the only server-side signal we
// get. Both sides earn: the shopper a little for the intent, the seller a little more
// for the interest. Self-adds earn nothing. Awards are idempotent per (listing, user)
// and clamped by the per-day caps inside award_engagement_points, so spamming the
// add/remove toggle can't farm points.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const listingId = Number(body?.listingId)

  if (!Number.isFinite(listingId) || listingId <= 0) {
    return NextResponse.json({ awarded: 0 }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Not signed in — nothing to award, but don't surface this as an error to the UI.
  if (!user) {
    return NextResponse.json({ awarded: 0 })
  }

  const { data: listing } = await supabase
    .from('single_inventory_items')
    .select('id, user_id')
    .eq('id', listingId)
    .maybeSingle()

  // Unknown listing, or the shopper is the seller — no signal worth rewarding.
  if (!listing || !listing.user_id || listing.user_id === user.id) {
    return NextResponse.json({ awarded: 0 })
  }

  const buyerAwarded = await awardEngagementPoints(supabase, {
    userId: user.id,
    amount: ENGAGEMENT_RULES.cart_add.points,
    reason: 'cart_add',
    sourceType: 'cart',
    sourceId: String(listingId),
    dailyCap: ENGAGEMENT_RULES.cart_add.dailyCap,
  })

  await awardEngagementPoints(supabase, {
    userId: listing.user_id,
    amount: ENGAGEMENT_RULES.cart_add_received.points,
    reason: 'cart_add_received',
    sourceType: 'cart',
    sourceId: `${listingId}:${user.id}`,
    dailyCap: ENGAGEMENT_RULES.cart_add_received.dailyCap,
  })

  return NextResponse.json({ awarded: buyerAwarded })
}
