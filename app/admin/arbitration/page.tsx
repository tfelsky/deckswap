import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAdminAccessForUser } from '@/lib/admin/access'
import {
  formatAuctionArbitrationIssueType,
  formatAuctionArbitrationStatus,
  formatAuctionStatus,
  isAuctionSchemaMissing,
} from '@/lib/auction/foundation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type ArbitrationQueueRow = {
  id: number
  auction_id: number
  status: string
  issue_type: string
  claimant_statement: string
  requested_action?: string | null
  last_checkpoint?: string | null
  created_at?: string | null
  auction_listings?: {
    id: number
    status: string
    settlement_mode?: string | null
    final_bid_usd?: number | null
    decks?: {
      name?: string | null
      commander?: string | null
    } | null
  } | null
}

export default async function AdminArbitrationPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = await getAdminAccessForUser(user)

  if (!user || !access.isAdmin) {
    redirect('/sign-in')
  }

  const result = await supabase
    .from('auction_arbitration_cases')
    .select('id, auction_id, status, issue_type, claimant_statement, requested_action, last_checkpoint, created_at, auction_listings!inner(id, status, settlement_mode, final_bid_usd, decks(name, commander))')
    .order('created_at', { ascending: false })

  if (result.error) {
    return (
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-6 text-sm text-amber-100">
          {isAuctionSchemaMissing(result.error.message)
            ? 'Run docs/sql/auction-foundation.sql to provision auction arbitration.'
            : result.error.message}
        </div>
      </section>
    )
  }

  const rows = ((result.data ?? []) as Array<any>).map((row) => ({
    ...row,
    auction_listings: Array.isArray(row.auction_listings)
      ? {
          ...row.auction_listings[0],
          decks: Array.isArray(row.auction_listings[0]?.decks)
            ? row.auction_listings[0].decks[0] ?? null
            : row.auction_listings[0]?.decks ?? null,
        }
      : row.auction_listings ?? null,
  })) as ArbitrationQueueRow[]
  const openCount = rows.filter((row) => row.status === 'open').length
  const inReviewCount = rows.filter((row) => row.status === 'in_review').length
  const resolvedCount = rows.filter((row) => row.status === 'resolved' || row.status === 'closed').length

  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-medium tracking-wide text-red-100">
            Arbitration Queue
          </div>
          <h2 className="mt-4 text-3xl font-semibold">Self-cleared auction disputes</h2>
          <p className="mt-2 max-w-3xl text-sm text-zinc-400">
            Review open self-cleared auction cases, confirm the last recorded checkpoint, and jump into the listing to resolve.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-zinc-900 p-5">
          <div className="text-sm text-zinc-400">Open</div>
          <div className="mt-2 text-3xl font-semibold text-red-100">{openCount}</div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-zinc-900 p-5">
          <div className="text-sm text-zinc-400">In Review</div>
          <div className="mt-2 text-3xl font-semibold text-amber-200">{inReviewCount}</div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-zinc-900 p-5">
          <div className="text-sm text-zinc-400">Resolved / Closed</div>
          <div className="mt-2 text-3xl font-semibold text-emerald-200">{resolvedCount}</div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {rows.length > 0 ? (
          rows.map((row) => (
            <article key={row.id} className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-3xl">
                  <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Case #{row.id}</div>
                  <h3 className="mt-2 text-2xl font-semibold text-white">
                    {row.auction_listings?.decks?.name ?? `Auction #${row.auction_id}`}
                  </h3>
                  <p className="mt-2 text-sm text-zinc-400">
                    {row.auction_listings?.decks?.commander ?? 'Commander not set'}
                  </p>
                  <p className="mt-4 text-sm leading-6 text-zinc-300">{row.claimant_statement}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs text-red-100">
                    {formatAuctionArbitrationStatus(row.status)}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200">
                    {formatAuctionArbitrationIssueType(row.issue_type)}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200">
                    {formatAuctionStatus(row.auction_listings?.status)}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Checkpoint</div>
                  <div className="mt-2 text-white">{row.last_checkpoint ?? 'Not recorded'}</div>
                  <div className="mt-3 text-xs text-zinc-500">Opened {row.created_at ? new Date(row.created_at).toLocaleString() : 'Unknown'}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Requested action</div>
                  <div className="mt-2 text-white">{row.requested_action?.trim() || 'No requested action recorded'}</div>
                </div>
                <div className="flex items-center">
                  <Link
                    href={`/auctions/${row.auction_id}`}
                    className="rounded-2xl bg-white px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90"
                  >
                    Open auction
                  </Link>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-10 text-center text-sm text-zinc-400">
            No arbitration cases have been opened yet.
          </div>
        )}
      </div>
    </section>
  )
}
