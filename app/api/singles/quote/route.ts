import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildSinglesQuote, type PublicSingleListing } from '@/lib/singles/marketplace'
import { type SinglesCartItem } from '@/lib/singles/pricing'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const cartItems = Array.isArray(body?.cartItems) ? (body.cartItems as SinglesCartItem[]) : []
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('single_inventory_items')
    .select(
      'id, user_id, card_name, quantity, marketplace_quantity_available, marketplace_price_usd, marketplace_currency, marketplace_visible, marketplace_status, marketplace_notes, foil, condition, language, set_code, set_name, collector_number, image_url, type_line, oracle_text, color_identity'
    )
    .eq('marketplace_visible', true)
    .eq('marketplace_status', 'active')
    .gt('marketplace_quantity_available', 0)
    .gt('marketplace_price_usd', 0)
    .eq('inventory_status', 'buy_it_now_live')

  if (error) {
    return NextResponse.json(
      { error: error.message || 'Unable to load live singles pricing.' },
      { status: 400 }
    )
  }

  const quote = buildSinglesQuote({
    cartItems,
    listings: ((data ?? []) as PublicSingleListing[]),
  })

  return NextResponse.json(quote)
}
