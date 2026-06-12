import Link from 'next/link'
import { redirect } from 'next/navigation'
import FormActionButton from '@/components/form-action-button'
import { getAdminAccessForUser } from '@/lib/admin/access'
import {
  getInventoryStatusBadgeClass,
  getInventoryStatusLabel,
} from '@/lib/decks/inventory-status'
import { createClient } from '@/lib/supabase/server'
import { updateHolidayDonationAction } from './actions'

export const dynamic = 'force-dynamic'

const HOLIDAY_STATUSES = ['holiday_pending_receipt', 'holiday_received', 'holiday_placed'] as const

type HolidayDeckRow = {
  id: number
  name: string
  user_id: string | null
  format?: string | null
  inventory_status: string
  holiday_donation_submitted_at?: string | null
  holiday_received_at?: string | null
  holiday_placed_at?: string | null
  holiday_admin_notes?: string | null
}

type DonorProfileRow = {
  user_id: string
  display_name?: string | null
  username?: string | null
}

function formatTimestamp(value?: string | null) {
  if (!value) return 'Not recorded'
  return new Date(value).toLocaleString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatUsd(value: number) {
  return `$${value.toFixed(2)}`
}

export default async function AdminHolidayGivebackPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = await getAdminAccessForUser(user)

  if (!user || !access.isAdmin) {
    redirect('/decks')
  }

  const params = (await searchParams) ?? {}
  const updated = String(params.updated ?? '') === '1'

  const { data: decksData, error: decksError } = await supabase
    .from('decks')
    .select(
      'id, name, user_id, format, inventory_status, holiday_donation_submitted_at, holiday_received_at, holiday_placed_at, holiday_admin_notes'
    )
    .in('inventory_status', [...HOLIDAY_STATUSES])
    .order('holiday_donation_submitted_at', { ascending: false })

  // Notes/timestamps ship behind a hand-applied migration; retry without them.
  let decks: HolidayDeckRow[] = []
  let schemaHint: string | null = null

  if (decksError) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('decks')
      .select('id, name, user_id, format, inventory_status, holiday_donation_submitted_at')
      .in('inventory_status', [...HOLIDAY_STATUSES])
      .order('holiday_donation_submitted_at', { ascending: false })

    if (fallbackError) {
      return (
        <section className="mx-auto max-w-7xl px-6 py-10">
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-200">
            {fallbackError.message}
          </div>
        </section>
      )
    }

    decks = (fallbackData ?? []) as HolidayDeckRow[]
    schemaHint =
      'Run docs/sql/holiday-giveback-admin.sql to enable received/placed timestamps and admin notes.'
  } else {
    decks = (decksData ?? []) as HolidayDeckRow[]
  }

  const deckIds = decks.map((deck) => deck.id)
  const donorIds = [...new Set(decks.map((deck) => deck.user_id).filter(Boolean))] as string[]

  const [cardsResult, profilesResult] = await Promise.all([
    deckIds.length
      ? supabase
          .from('deck_cards')
          .select('deck_id, quantity, foil, price_usd, price_usd_foil')
          .in('deck_id', deckIds)
      : Promise.resolve({ data: [] as any[] }),
    donorIds.length
      ? supabase.from('profiles').select('user_id, display_name, username').in('user_id', donorIds)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const valueByDeck = new Map<number, number>()
  for (const card of (cardsResult.data ?? []) as Array<{
    deck_id: number
    quantity: number | null
    foil: boolean | null
    price_usd: number | null
    price_usd_foil: number | null
  }>) {
    const unit = card.foil
      ? Number(card.price_usd_foil ?? card.price_usd ?? 0)
      : Number(card.price_usd ?? card.price_usd_foil ?? 0)
    valueByDeck.set(
      card.deck_id,
      (valueByDeck.get(card.deck_id) ?? 0) + unit * Number(card.quantity ?? 0)
    )
  }

  const donorByUser = new Map<string, DonorProfileRow>(
    ((profilesResult.data ?? []) as DonorProfileRow[]).map((row) => [row.user_id, row])
  )

  function donorLabel(userId: string | null) {
    if (!userId) return 'Unknown donor'
    const profile = donorByUser.get(userId)
    return (
      profile?.display_name?.trim() ||
      (profile?.username?.trim() ? `@${profile.username.trim()}` : `${userId.slice(0, 8)}…`)
    )
  }

  const pendingCount = decks.filter((d) => d.inventory_status === 'holiday_pending_receipt').length
  const receivedCount = decks.filter((d) => d.inventory_status === 'holiday_received').length
  const placedCount = decks.filter((d) => d.inventory_status === 'holiday_placed').length
  const totalValue = decks.reduce((sum, deck) => sum + (valueByDeck.get(deck.id) ?? 0), 0)

  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-zinc-400">Pending Receipt</div>
          <div className="mt-2 text-3xl font-semibold text-amber-200">{pendingCount}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-zinc-400">Received</div>
          <div className="mt-2 text-3xl font-semibold text-sky-200">{receivedCount}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-zinc-400">Placed</div>
          <div className="mt-2 text-3xl font-semibold text-emerald-300">{placedCount}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-zinc-400">Total Donated Value</div>
          <div className="mt-2 text-3xl font-semibold text-emerald-300">{formatUsd(totalValue)}</div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Holiday Giveback Operations</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Track donated decks from pledge to receipt to placement. Donors are notified when
              their deck is received or placed.
            </p>
          </div>
          <Link
            href="/holiday-giveback"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            View public campaign page
          </Link>
        </div>

        {updated && (
          <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
            Donation updated and the donor was notified.
          </div>
        )}

        {schemaHint && (
          <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            {schemaHint}
          </div>
        )}

        {decks.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-zinc-300">
            No holiday donations are in the pipeline right now.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {decks.map((deck) => (
              <div key={deck.id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/decks/${deck.id}`}
                        className="text-lg font-semibold text-white hover:underline"
                      >
                        {deck.name}
                      </Link>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs ${getInventoryStatusBadgeClass(deck.inventory_status)}`}
                      >
                        {getInventoryStatusLabel(deck.inventory_status)}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-zinc-400">
                      Donor: {donorLabel(deck.user_id)} · Pledged:{' '}
                      {formatTimestamp(deck.holiday_donation_submitted_at)}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      Received: {formatTimestamp(deck.holiday_received_at)} · Placed:{' '}
                      {formatTimestamp(deck.holiday_placed_at)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-right">
                    <div className="text-xs uppercase tracking-wide text-emerald-100/70">
                      Estimated Value
                    </div>
                    <div className="mt-1 text-lg font-semibold text-emerald-300">
                      {formatUsd(valueByDeck.get(deck.id) ?? 0)}
                    </div>
                  </div>
                </div>

                <form
                  action={updateHolidayDonationAction}
                  className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 sm:grid-cols-[200px_1fr_auto] sm:items-end"
                >
                  <input type="hidden" name="deck_id" value={deck.id} />
                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-500">
                      Status
                    </label>
                    <select
                      name="next_status"
                      defaultValue={deck.inventory_status}
                      className="w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-white"
                    >
                      <option value="holiday_pending_receipt">Pending Receipt</option>
                      <option value="holiday_received">Received</option>
                      <option value="holiday_placed">Placed</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-500">
                      Internal Notes
                    </label>
                    <input
                      type="text"
                      name="admin_notes"
                      defaultValue={deck.holiday_admin_notes ?? ''}
                      placeholder="Condition, recipient, logistics notes…"
                      className="w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-white"
                    />
                  </div>
                  <FormActionButton
                    pendingLabel="Saving..."
                    className="rounded-xl bg-emerald-400 px-4 py-3 text-sm font-medium text-zinc-950 disabled:cursor-wait disabled:opacity-70"
                  >
                    Save
                  </FormActionButton>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
