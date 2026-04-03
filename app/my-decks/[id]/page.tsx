import { createClient } from '@/lib/supabase/server'
import { getCommanderBracketSummary } from '@/lib/commander/brackets'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function ManageDeckPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const deckId = Number(id)

  if (!Number.isFinite(deckId)) {
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
          <h1 className="text-2xl font-semibold text-red-300">Invalid deck ID</h1>
          <p className="mt-2 text-sm text-zinc-300">Route value: {id}</p>
          <Link
            href="/my-decks"
            className="mt-5 inline-block rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            Back to My Decks
          </Link>
        </div>
      </main>
    )
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const { data: deck, error } = await supabase
    .from('decks')
    .select('*')
    .eq('id', deckId)
    .single()

  const { data: deckCards } = await supabase
    .from('deck_cards')
    .select('card_name, section, quantity, cmc, mana_cost')
    .eq('deck_id', deckId)

  const bracketSummary = getCommanderBracketSummary((deckCards ?? []) as Array<{
    card_name: string
    section: 'commander' | 'mainboard' | 'token'
    quantity: number
    cmc?: number | null
    mana_cost?: string | null
  }>)

  if (error || !deck) {
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
          <h1 className="text-2xl font-semibold text-red-300">Deck not found</h1>
          <p className="mt-2 text-sm text-zinc-300">Tried deck ID: {deckId}</p>
          {error && (
            <p className="mt-2 text-sm text-zinc-400">Supabase: {error.message}</p>
          )}
          <Link
            href="/my-decks"
            className="mt-5 inline-block rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            Back to My Decks
          </Link>
        </div>
      </main>
    )
  }

  if (deck.user_id !== user.id) {
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
          <h1 className="text-2xl font-semibold text-red-300">Not authorized</h1>
          <p className="mt-2 text-sm text-zinc-300">
            This deck does not belong to your account.
          </p>
          <Link
            href="/my-decks"
            className="mt-5 inline-block rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            Back to My Decks
          </Link>
        </div>
      </main>
    )
  }

  async function updateDeck(formData: FormData) {
    'use server'

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/sign-in')
    }

    const name = formData.get('name') as string
    const commander = formData.get('commander') as string
    const valueRaw = formData.get('price_estimate') as string

    const value =
      valueRaw && valueRaw.trim() !== '' ? Number(valueRaw) : null

    await supabase
      .from('decks')
      .update({
        name,
        commander: commander || null,
        price_estimate: value,
      })
      .eq('id', deckId)
      .eq('user_id', user.id)

    redirect('/my-decks')
  }

  async function deleteDeck() {
    'use server'

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/sign-in')
    }

    await supabase
      .from('decks')
      .delete()
      .eq('id', deckId)
      .eq('user_id', user.id)

    redirect('/my-decks')
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="mx-auto max-w-xl">
        <Link
          href="/my-decks"
          className="text-sm text-zinc-400 hover:underline"
        >
          ← Back
        </Link>

        <h1 className="mt-4 mb-6 text-2xl font-semibold">Manage Deck</h1>

        <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm text-zinc-400">Auto-estimated Commander Bracket</div>
          <div className="mt-2 text-xl font-semibold text-white">
            {bracketSummary.label}
          </div>
          <p className="mt-2 text-sm text-zinc-400">
            {bracketSummary.description}
          </p>
        </div>

        <form action={updateDeck} className="space-y-4">
          <input
            name="name"
            defaultValue={deck.name}
            className="w-full rounded-xl border border-white/10 bg-white/5 p-3"
          />

          <input
            name="commander"
            defaultValue={deck.commander ?? ''}
            className="w-full rounded-xl border border-white/10 bg-white/5 p-3"
          />

          <input
            name="price_estimate"
            type="number"
            defaultValue={deck.price_estimate ?? ''}
            className="w-full rounded-xl border border-white/10 bg-white/5 p-3"
          />

          <button className="w-full rounded-xl bg-emerald-400 py-3 text-black">
            Save Changes
          </button>
        </form>

        <form action={deleteDeck} className="mt-6">
          <button className="w-full rounded-xl bg-red-500 py-3">
            Delete Deck
          </button>
        </form>
      </div>
    </main>
  )
}
