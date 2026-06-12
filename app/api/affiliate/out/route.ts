import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

const ALLOWED_HOSTS = new Set([
  'www.tcgplayer.com',
  'tcgplayer.com',
  'www.cardmarket.com',
  'cardmarket.com',
  'www.cardkingdom.com',
  'cardkingdom.com',
  'scryfall.com',
  'www.scryfall.com',
])

function safeTarget(value: string | null) {
  if (!value) return null

  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return null
    if (!ALLOWED_HOSTS.has(url.hostname)) return null
    return url
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const target = safeTarget(request.nextUrl.searchParams.get('target'))

  if (!target) {
    return NextResponse.redirect(new URL('/optimizer', request.url))
  }

  const marketplace = request.nextUrl.searchParams.get('marketplace')?.slice(0, 80) ?? null
  const cardName = request.nextUrl.searchParams.get('card')?.slice(0, 180) ?? null
  const opportunityId =
    request.nextUrl.searchParams.get('opportunityId')?.slice(0, 120) ?? null
  const deckIdValue = Number(request.nextUrl.searchParams.get('deckId'))
  const deckId = Number.isFinite(deckIdValue) && deckIdValue > 0 ? deckIdValue : null

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    await supabase.from('affiliate_clicks').insert({
      user_id: user?.id ?? null,
      deck_id: deckId,
      card_name: cardName,
      marketplace,
      opportunity_id: opportunityId,
      target_url: target.toString(),
      referrer: request.headers.get('referer'),
      user_agent: request.headers.get('user-agent'),
      clicked_at: new Date().toISOString(),
    })
  } catch {
    // Click tracking should never block the outbound marketplace handoff.
  }

  return NextResponse.redirect(target)
}
