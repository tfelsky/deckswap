import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import DeckCardViews from '@/components/deck-card-views'

type Deck = {
  id: number
  name: string
  commander?: string | null
  power_level?: number | null
  price_estimate?: number | null
  image_url?: string | null
  is_valid?: boolean | null
  validation_errors?: string[] | null
  commander_mode?: string | null
price_total_usd?: number | null
price_total_usd_foil?: number | null
price_total_eur?: number | null
}

type DeckCard = {
  id: number
  section: 'commander' | 'mainboard'
  quantity: number
  card_name: string
  set_code?: string | null
  set_name?: string | null
  collector_number?: string | null
  foil?: boolean | null
  sort_order?: number | null
  image_url?: string | null
  price_usd?: number | null
  price_usd_foil?: number | null
}

type DeckToken = {
  id: number
  quantity: number
  token_name: string
  set_code?: string | null
  set_name?: string | null
  collector_number?: string | null
  foil?: boolean | null
  sort_order?: number | null
  image_url?: string | null
  price_usd?: number | null
  price_usd_foil?: number | null
}

export default async function DeckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const deckId = Number(id)
  const supabase = await createClient()

 const { data: deck, error: deckError } = await supabase
  .from('decks')
  .select(
    'id, name, commander, power_level, price_estimate, image_url, is_valid, validation_errors, commander_mode, price_total_usd, price_total_usd_foil, price_total_eur'
  )
  .eq('id', deckId)
  .single()

  if (deckError || !deck) {
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
          <h1 className="text-2xl font-semibold text-red-400">Deck not found</h1>
          <p className="mt-2 text-sm text-zinc-300">Tried to load deck ID: {id}</p>
          {deckError && (
            <p className="mt-2 text-sm text-zinc-400">
              Supabase error: {deckError.message}
            </p>
          )}
          <Link
            href="/decks"
            className="mt-5 inline-block rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            Back to decks
          </Link>
        </div>
      </main>
    )
  }

  const { data: cards, error: cardsError } = await supabase
    .from('deck_cards')
    .select(
      'id, section, quantity, card_name, set_code, set_name, collector_number, foil, sort_order, image_url, price_usd, price_usd_foil'
    )
    .eq('deck_id', deckId)
    .order('section', { ascending: true })
    .order('sort_order', { ascending: true })

  const { data: tokens, error: tokensError } = await supabase
    .from('deck_tokens')
    .select(
      'id, quantity, token_name, set_code, set_name, collector_number, foil, sort_order, image_url, price_usd, price_usd_foil'
    )
    .eq('deck_id', deckId)
    .order('sort_order', { ascending: true })

  if (cardsError || tokensError) {
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
          <h1 className="text-2xl font-semibold text-red-400">
            Failed to load deck contents
          </h1>
          {cardsError && (
            <p className="mt-2 text-sm text-zinc-300">
              deck_cards: {cardsError.message}
            </p>
          )}
          {tokensError && (
            <p className="mt-2 text-sm text-zinc-300">
              deck_tokens: {tokensError.message}
            </p>
          )}
        </div>
      </main>
    )
  }

  const typedDeck = deck as Deck
  const typedCards = (cards ?? []) as DeckCard[]
  const typedTokens = (tokens ?? []) as DeckToken[]

  const commanders = typedCards.filter((c) => c.section === 'commander')
  const mainboard = typedCards.filter((c) => c.section === 'mainboard')

  const tokenCards = typedTokens.map((token) => ({
    id: token.id,
    quantity: token.quantity,
    card_name: token.token_name,
    set_code: token.set_code,
    set_name: token.set_name,
    collector_number: token.collector_number,
    foil: token.foil,
    image_url: token.image_url,
    price_usd: token.price_usd,
    price_usd_foil: token.price_usd_foil,
    section: 'token' as const,
  }))

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <Link
            href="/decks"
            className="inline-block rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10"
          >
            ← Back to marketplace
          </Link>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,440px)_1fr] lg:items-start">
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900">
              <div className="mx-auto w-full max-w-sm p-6 pb-0">
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950 shadow-2xl">
                  <div className="aspect-[5/7]">
                    {typedDeck.image_url ? (
                      <img
                        src={typedDeck.image_url}
                        alt={typedDeck.name}
                        className="h-full w-full object-cover object-top"
                      />
                    ) : (
                      <div className="flex h-full items-end p-6">
                        <div>
                          <div className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">
                            Commander Deck
                          </div>
                          <div className="mt-2 text-3xl font-semibold">
                            {typedDeck.commander || 'Unknown Commander'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6">
                <h1 className="text-3xl font-semibold">{typedDeck.name}</h1>
                <p className="mt-2 text-zinc-400">
                  Commander mode: {typedDeck.commander_mode || 'unknown'}
                </p>

                {!typedDeck.is_valid &&
                  typedDeck.validation_errors &&
                  typedDeck.validation_errors.length > 0 && (
                    <div className="mt-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-200">
                      <div className="font-medium">Validation issues</div>
                      <ul className="mt-2 list-disc pl-5">
                        {typedDeck.validation_errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            </div>

       <div className="space-y-4">
  <div className="rounded-3xl border border-white/10 bg-zinc-900 p-5">
    <div className="text-sm text-zinc-400">Power Level</div>
    <div className="mt-2 text-3xl font-semibold">
      {typedDeck.power_level ?? '—'}
    </div>
  </div>

  <div className="rounded-3xl border border-white/10 bg-zinc-900 p-5">
    <div className="text-sm text-zinc-400">Estimated Value</div>
    <div className="mt-2 text-3xl font-semibold text-emerald-300">
      $
      {typedDeck.price_estimate != null
        ? Number(typedDeck.price_estimate).toFixed(0)
        : '—'}
    </div>
  </div>

  <div className="rounded-3xl border border-white/10 bg-zinc-900 p-5">
    <div className="text-sm text-zinc-400">Imported Pricing</div>
    <div className="mt-3 space-y-2 text-sm text-zinc-300">
      <div>
        USD:{' '}
        <span className="font-semibold text-white">
          ${typedDeck.price_total_usd?.toFixed(2) ?? '0.00'}
        </span>
      </div>
      <div>
        USD Foil Basis:{' '}
        <span className="font-semibold text-white">
          ${typedDeck.price_total_usd_foil?.toFixed(2) ?? '0.00'}
        </span>
      </div>
      <div>
        EUR:{' '}
        <span className="font-semibold text-white">
          €{typedDeck.price_total_eur?.toFixed(2) ?? '0.00'}
        </span>
      </div>
    </div>
  </div>

  <div className="rounded-3xl border border-white/10 bg-zinc-900 p-5">
    <div className="text-sm text-zinc-400">Contents</div>
    <div className="mt-3 space-y-2 text-sm text-zinc-300">
      <div>Commanders: {commanders.reduce((s, c) => s + c.quantity, 0)}</div>
      <div>Mainboard: {mainboard.reduce((s, c) => s + c.quantity, 0)}</div>
      <div>Tokens: {tokenCards.reduce((s, c) => s + c.quantity, 0)}</div>
    </div>
  </div>
</div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <DeckCardViews
          commanders={commanders}
          mainboard={mainboard}
          tokens={tokenCards}
        />
      </section>
    </main>
  )
}
