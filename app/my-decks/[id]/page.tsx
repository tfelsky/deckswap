import { createClient } from '@/lib/supabase/server'
import { getCommanderBracketSummary } from '@/lib/commander/brackets'
import { validateDeckForFormat } from '@/lib/commander/validate'
import { getDeckFormatLabel, SUPPORTED_DECK_FORMATS, formatSupportsCommanderRules, normalizeDeckFormat } from '@/lib/decks/formats'
import { calculatePercentChange, findImportSnapshot, findNearestSnapshotBeforeDays, formatPercentChange, type DeckPriceSnapshot } from '@/lib/decks/price-history'
import Link from 'next/link'
import { redirect } from 'next/navigation'

const ADMIN_EMAIL = 'tim.felsky@gmail.com'

export const dynamic = 'force-dynamic'

function formatImportedAt(value?: string | null) {
  if (!value) return 'Unknown'
  return new Date(value).toLocaleString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function changeTone(value: number | null) {
  if (value == null) return 'text-zinc-400'
  if (value > 0) return 'text-emerald-300'
  if (value < 0) return 'text-red-300'
  return 'text-zinc-300'
}

export default async function ManageDeckPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : {}
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
    .select('card_name, section, quantity, cmc, mana_cost, set_code, set_name, collector_number, foil, is_legendary, is_background, can_be_commander, keywords, partner_with_name, color_identity')
    .eq('deck_id', deckId)

  const { data: priceHistory } = await supabase
    .from('deck_price_history')
    .select('captured_at, price_total_usd_foil, snapshot_type')
    .eq('deck_id', deckId)
    .order('captured_at', { ascending: false })

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

  const isAdmin = user.email === ADMIN_EMAIL
  const activeTab =
    resolvedSearchParams?.tab === 'settings' ? 'settings' : 'overview'
  const deckFormat = normalizeDeckFormat(deck.format)
  const isCommanderDeck = formatSupportsCommanderRules(deckFormat)
  const snapshots = (priceHistory ?? []) as DeckPriceSnapshot[]
  const currentPrice = Number(deck.price_total_usd_foil ?? 0)
  const importSnapshot = findImportSnapshot(snapshots)
  const change30 = calculatePercentChange(
    currentPrice,
    findNearestSnapshotBeforeDays(snapshots, 30)?.price_total_usd_foil ?? null
  )
  const change60 = calculatePercentChange(
    currentPrice,
    findNearestSnapshotBeforeDays(snapshots, 60)?.price_total_usd_foil ?? null
  )

  async function updateOverview(formData: FormData) {
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

    await supabase
      .from('decks')
      .update({
        name,
        commander: commander || null,
      })
      .eq('id', deckId)
      .eq('user_id', user.id)

    redirect(`/my-decks/${deckId}`)
  }

  async function updateSettings(formData: FormData) {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/sign-in')
    }

    const nextFormat = normalizeDeckFormat(String(formData.get('format') || 'unknown'))

    const { data: currentCards } = await supabase
      .from('deck_cards')
      .select('section, quantity, card_name, set_code, set_name, collector_number, foil, is_legendary, is_background, can_be_commander, keywords, partner_with_name, color_identity')
      .eq('deck_id', deckId)

    const validation = validateDeckForFormat(
      ((currentCards ?? []) as Array<{
        section: 'commander' | 'mainboard'
        quantity: number
        card_name: string
        set_code?: string | null
        set_name?: string | null
        collector_number?: string | null
        foil?: boolean | null
        is_legendary?: boolean | null
        is_background?: boolean | null
        can_be_commander?: boolean | null
        keywords?: string[] | null
        partner_with_name?: string | null
        color_identity?: string[] | null
      }>).map((card) => ({
        section: card.section,
        quantity: card.quantity,
        cardName: card.card_name,
        setCode: card.set_code ?? undefined,
        setName: card.set_name ?? undefined,
        collectorNumber: card.collector_number ?? undefined,
        foil: card.foil ?? false,
        isLegendary: card.is_legendary ?? undefined,
        isBackground: card.is_background ?? undefined,
        canBeCommander: card.can_be_commander ?? undefined,
        keywords: card.keywords ?? undefined,
        partnerWithName: card.partner_with_name ?? undefined,
        colorIdentity: card.color_identity ?? undefined,
      })),
      nextFormat
    )

    await supabase
      .from('decks')
      .update({
        format: nextFormat,
        is_valid: validation.isValid,
        validation_errors: validation.errors,
        commander_count: validation.commanderCount,
        mainboard_count: validation.mainboardCount,
        token_count: validation.tokenCount,
        commander_mode: validation.commanderMode,
      })
      .eq('id', deckId)
      .eq('user_id', user.id)

    redirect(`/my-decks/${deckId}?tab=settings`)
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
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/my-decks"
            className="text-sm text-zinc-400 hover:underline"
          >
            {'<-'} Back
          </Link>

          <Link
            href="/import-deck"
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-sm text-white hover:bg-white/10"
          >
            Import Deck
          </Link>

          <Link
            href={`/decks/${deckId}`}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-sm text-white hover:bg-white/10"
          >
            Public Deck View
          </Link>

          {isAdmin && (
            <Link
              href="/admin"
              className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-sm font-medium text-emerald-300 hover:bg-emerald-400/15"
            >
              Admin Dashboard
            </Link>
          )}
        </div>

        <div className="mt-6 rounded-3xl border border-white/10 bg-zinc-900 p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-zinc-300">
                {getDeckFormatLabel(deckFormat)}
              </div>
              <h1 className="mt-4 text-3xl font-semibold">{deck.name}</h1>
              <p className="mt-2 text-sm text-zinc-400">
                Imported {formatImportedAt(deck.imported_at)}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">Current Value</div>
                <div className="mt-2 text-2xl font-semibold text-emerald-300">
                  ${currentPrice.toFixed(2)}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">30d Move</div>
                <div className={`mt-2 text-2xl font-semibold ${changeTone(change30)}`}>
                  {formatPercentChange(change30) ?? 'Awaiting history'}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">60d Move</div>
                <div className={`mt-2 text-2xl font-semibold ${changeTone(change60)}`}>
                  {formatPercentChange(change60) ?? 'Awaiting history'}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/my-decks/${deckId}`}
              className={`rounded-2xl px-4 py-2 text-sm font-medium ${
                activeTab === 'overview'
                  ? 'bg-emerald-400 text-zinc-950'
                  : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
              }`}
            >
              Overview
            </Link>
            <Link
              href={`/my-decks/${deckId}?tab=settings`}
              className={`rounded-2xl px-4 py-2 text-sm font-medium ${
                activeTab === 'settings'
                  ? 'bg-emerald-400 text-zinc-950'
                  : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
              }`}
            >
              Deck Settings
            </Link>
          </div>
        </div>

        {activeTab === 'overview' ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Overview</h2>
              <form action={updateOverview} className="mt-6 space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Deck name</label>
                  <input
                    name="name"
                    defaultValue={deck.name}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-3"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-400">
                    Commander or lead card
                  </label>
                  <input
                    name="commander"
                    defaultValue={deck.commander ?? ''}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-3"
                  />
                </div>

                <button className="w-full rounded-xl bg-emerald-400 py-3 text-black">
                  Save Overview
                </button>
              </form>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <h2 className="text-2xl font-semibold">
                  {isCommanderDeck ? 'Commander Bracket' : 'Deck Format'}
                </h2>
                {isCommanderDeck ? (
                  <>
                    <div className="mt-3 text-xl font-semibold">{bracketSummary.label}</div>
                    <p className="mt-2 text-sm text-zinc-400">{bracketSummary.description}</p>
                  </>
                ) : (
                  <>
                    <div className="mt-3 text-xl font-semibold">{getDeckFormatLabel(deckFormat)}</div>
                    <p className="mt-2 text-sm text-zinc-400">
                      This deck uses relaxed import validation tuned for non-Commander formats.
                    </p>
                  </>
                )}
              </div>

              <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <h2 className="text-2xl font-semibold">Import Snapshot</h2>
                <div className="mt-4 space-y-2 text-sm text-zinc-300">
                  <p>Imported at: {formatImportedAt(deck.imported_at)}</p>
                  <p>
                    Import price:{' '}
                    {importSnapshot?.price_total_usd_foil != null
                      ? `$${Number(importSnapshot.price_total_usd_foil).toFixed(2)}`
                      : 'Awaiting first priced snapshot'}
                  </p>
                  <p>Source type: {deck.source_type || 'Unknown'}</p>
                  <p>Source URL: {deck.source_url || 'None recorded'}</p>
                </div>
              </div>

              <form action={deleteDeck}>
                <button className="w-full rounded-xl bg-red-500 py-3">
                  Delete Deck
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Deck Settings</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Override format detection, keep import metadata visible, and let validation adapt to the kind of deck you actually uploaded.
              </p>

              <form action={updateSettings} className="mt-6 space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Detected / chosen format</label>
                  <select
                    name="format"
                    defaultValue={deckFormat}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-3"
                  >
                    {SUPPORTED_DECK_FORMATS.map((format) => (
                      <option key={format} value={format}>
                        {getDeckFormatLabel(format)}
                      </option>
                    ))}
                  </select>
                </div>

                <button className="w-full rounded-xl bg-emerald-400 py-3 text-black">
                  Save Settings
                </button>
              </form>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <h2 className="text-2xl font-semibold">Import Metadata</h2>
                <div className="mt-4 space-y-2 text-sm text-zinc-300">
                  <p>Imported at: {formatImportedAt(deck.imported_at)}</p>
                  <p>Source type: {deck.source_type || 'Unknown'}</p>
                  <p>Source URL: {deck.source_url || 'None recorded'}</p>
                  <p>Validation status: {deck.is_valid ? 'Valid' : 'Needs review'}</p>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <h2 className="text-2xl font-semibold">Price History</h2>
                <div className="mt-4 space-y-2 text-sm text-zinc-300">
                  <p>Current price: ${currentPrice.toFixed(2)}</p>
                  <p>
                    Import snapshot:{' '}
                    {importSnapshot?.price_total_usd_foil != null
                      ? `$${Number(importSnapshot.price_total_usd_foil).toFixed(2)}`
                      : 'Not captured yet'}
                  </p>
                  <p className={changeTone(change30)}>
                    30-day move: {formatPercentChange(change30) ?? 'Awaiting enough history'}
                  </p>
                  <p className={changeTone(change60)}>
                    60-day move: {formatPercentChange(change60) ?? 'Awaiting enough history'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
