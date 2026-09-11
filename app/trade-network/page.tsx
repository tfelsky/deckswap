import AppHeader from '@/components/app-header'
import { getAdminAccessForUser } from '@/lib/admin/access'
import { createAdminClientOrNull } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  buildNetworkLots,
  generateNetworkProposals,
  isTradeNetworkSchemaMissing,
  orientProposal,
  proposalsForUser,
  DEFAULT_MIN_ITEM_VALUE_USD,
  DEFAULT_MINIMUM_AGE_DAYS,
  type NetworkInventoryItem,
  type TradeNetworkLinkupRow,
  type TradeNetworkMembership,
} from '@/lib/trade-network'
import type { WholesaleInventoryLot } from '@/lib/wholesale-turnover'
import { Handshake, Hourglass, Network, Scale } from 'lucide-react'
import Link from 'next/link'
import { requestLinkUpAction, respondLinkUpAction, saveMembershipAction } from './actions'

export const dynamic = 'force-dynamic'

function formatUsd(value: number) {
  return `$${Math.round(value).toLocaleString('en-US')}`
}

function scoreTone(score: number) {
  if (score >= 80) return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
  if (score >= 65) return 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200'
  if (score >= 50) return 'border-amber-400/20 bg-amber-400/10 text-amber-200'
  return 'border-white/10 bg-white/5 text-zinc-200'
}

const LINKUP_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  withdrawn: 'Withdrawn',
}

export default async function TradeNetworkPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="min-h-screen bg-zinc-950 pt-32 text-white">
        <AppHeader current="trade-network" isSignedIn={false} />
        <section className="mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-8">
            <h1 className="text-3xl font-semibold">Trade Network Link-Up</h1>
            <p className="mt-3 text-zinc-400">
              Opt your aged high-end singles into the community trade network and get
              matched with other members holding stale expensive stock. Balanced
              bundle-for-bundle swaps, with cash equalization when values don&apos;t
              quite line up.
            </p>
            <Link
              href="/sign-in?next=%2Ftrade-network"
              className="mt-6 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              Sign in
            </Link>
          </div>
        </section>
      </main>
    )
  }

  const { isAdmin } = await getAdminAccessForUser(user)

  // Own membership + link-ups go through the user client (RLS scopes them).
  const membershipResult = await supabase
    .from('trade_network_memberships')
    .select(
      'user_id, enabled, display_name, country, min_item_value_usd, minimum_age_days, wanted_categories, blocked_user_ids'
    )
    .eq('user_id', user.id)
    .maybeSingle()

  const schemaMissing = isTradeNetworkSchemaMissing(membershipResult.error?.message)
  const membership = (membershipResult.data ?? null) as TradeNetworkMembership | null

  const linkupsResult = schemaMissing
    ? { data: null }
    : await supabase
        .from('trade_network_linkups')
        .select(
          'id, initiated_by_user_id, counterparty_user_id, status, message, proposal, responded_at, created_at, updated_at'
        )
        .or(`initiated_by_user_id.eq.${user.id},counterparty_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(50)

  const linkups = (linkupsResult.data ?? []) as TradeNetworkLinkupRow[]

  // Matching pools every enabled member's inventory, which RLS hides from
  // other users — so it runs through the admin client on the server only.
  const admin = createAdminClientOrNull()
  let matches: ReturnType<typeof orientProposal>[] = []
  let networkMemberCount = 0
  let matchingUnavailable = false

  if (!schemaMissing && membership?.enabled && admin) {
    const membershipsResult = await admin
      .from('trade_network_memberships')
      .select(
        'user_id, enabled, display_name, country, min_item_value_usd, minimum_age_days, wanted_categories, blocked_user_ids'
      )
      .eq('enabled', true)

    const members = (membershipsResult.data ?? []) as TradeNetworkMembership[]
    networkMemberCount = members.length

    if (members.length > 1) {
      const membershipsByUser = new Map(members.map((member) => [member.user_id, member]))
      const itemsResult = await admin
        .from('single_inventory_items')
        .select(
          'id, user_id, card_name, quantity, foil, set_name, rarity, type_line, price_usd, price_usd_foil, inventory_status, imported_at'
        )
        .in('user_id', [...membershipsByUser.keys()])
        .in('inventory_status', ['staged', 'buy_it_now_live'])
        .limit(4000)

      const lots = buildNetworkLots(
        (itemsResult.data ?? []) as NetworkInventoryItem[],
        membershipsByUser
      )
      const proposals = generateNetworkProposals(lots, { proposalLimit: 40 })
      matches = proposalsForUser(proposals, user.id).map((proposal) =>
        orientProposal(proposal, user.id)
      )
    }
  } else if (!schemaMissing && membership?.enabled && !admin) {
    matchingUnavailable = true
  }

  const pendingCounterpartyIds = new Set(
    linkups
      .filter((linkup) => linkup.status === 'pending')
      .flatMap((linkup) => [linkup.initiated_by_user_id, linkup.counterparty_user_id])
  )

  return (
    <main className="min-h-screen bg-zinc-950 pt-32 text-white">
      <AppHeader current="trade-network" isSignedIn isAdmin={isAdmin} />

      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-900/40 p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Network className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-3xl font-semibold">Trade Network Link-Up</h1>
              <p className="text-sm text-zinc-400">
                Pool your aged high-end singles with other members and swap stale stock
                in balanced bundle-for-bundle trades.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Feature icon={<Hourglass className="h-5 w-5" />} title="Aged inventory only">
              Only cards that have sat in your inventory past your aging threshold are
              pooled — fresh stock stays out.
            </Feature>
            <Feature icon={<Scale className="h-5 w-5" />} title="Balanced bundles">
              The matcher assembles bundles from both sides and trims until values line
              up, suggesting cash equalization for any remaining gap.
            </Feature>
            <Feature icon={<Handshake className="h-5 w-5" />} title="Link up directly">
              Send a link-up request from any match. Once accepted, coordinate the swap
              with your counterparty.
            </Feature>
          </div>
        </div>

        {schemaMissing ? (
          <div className="mt-8 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-6 text-sm text-amber-200">
            The trade network tables haven&apos;t been created yet. Run the latest
            Supabase migrations (`supabase db push`) to enable this feature.
          </div>
        ) : (
          <>
            <MembershipForm membership={membership} />

            {membership?.enabled ? (
              <div className="mt-8">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-xl font-semibold">Proposed link-ups</h2>
                  <span className="text-xs text-zinc-500">
                    {networkMemberCount} member{networkMemberCount === 1 ? '' : 's'} in the
                    network
                  </span>
                </div>

                {matchingUnavailable ? (
                  <p className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-200">
                    Matching is unavailable: the server is missing
                    SUPABASE_SERVICE_ROLE_KEY, which pooled matching requires.
                  </p>
                ) : matches.length === 0 ? (
                  <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-400">
                    No balanced matches yet. Matches appear when another member&apos;s
                    aged high-end stock lines up in value with yours — check back as the
                    network grows, or lower your minimum card value below.
                  </p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {matches.map((match) => (
                      <MatchCard
                        key={`${match.proposal.ownerAId}-${match.proposal.ownerBId}`}
                        match={match}
                        alreadyPending={pendingCounterpartyIds.has(match.counterpartyId)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-400">
                Join the network above to see proposed link-ups for your aged high-end
                inventory.
              </p>
            )}

            {linkups.length > 0 && (
              <div className="mt-10">
                <h2 className="text-xl font-semibold">Link-up requests</h2>
                <div className="mt-4 space-y-4">
                  {linkups.map((linkup) => (
                    <LinkupCard key={linkup.id} linkup={linkup} currentUserId={user.id} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  )
}

function Feature({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <span className="text-sm font-semibold text-white">{title}</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-zinc-400">{children}</p>
    </div>
  )
}

function MembershipForm({ membership }: { membership: TradeNetworkMembership | null }) {
  return (
    <form
      action={saveMembershipAction}
      className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-6"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Network membership</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Choose what counts as &quot;aged&quot; and &quot;high end&quot; for your
            inventory. Only staged and buy-it-now singles are pooled.
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={membership?.enabled ?? false}
            className="h-4 w-4 accent-emerald-400"
          />
          Opted in
        </label>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Display name">
          <input
            type="text"
            name="display_name"
            defaultValue={membership?.display_name ?? ''}
            placeholder="Shown to matched members"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-emerald-400/50"
          />
        </Field>
        <Field label="Country">
          <input
            type="text"
            name="country"
            defaultValue={membership?.country ?? ''}
            placeholder="e.g. CA"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-emerald-400/50"
          />
        </Field>
        <Field label="Minimum card value (USD)">
          <input
            type="number"
            name="min_item_value_usd"
            min={0}
            step={1}
            defaultValue={membership?.min_item_value_usd ?? DEFAULT_MIN_ITEM_VALUE_USD}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-emerald-400/50"
          />
        </Field>
        <Field label="Minimum age (days in inventory)">
          <input
            type="number"
            name="minimum_age_days"
            min={0}
            step={1}
            defaultValue={membership?.minimum_age_days ?? DEFAULT_MINIMUM_AGE_DAYS}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-emerald-400/50"
          />
        </Field>
        <Field label="Wanted categories (comma-separated)" className="sm:col-span-2 lg:col-span-2">
          <input
            type="text"
            name="wanted_categories"
            defaultValue={(membership?.wanted_categories ?? []).join(', ')}
            placeholder="e.g. creature, mythic, foil — leave blank for anything"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-emerald-400/50"
          />
        </Field>
      </div>

      <button
        type="submit"
        className="mt-5 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        Save membership
      </button>
    </form>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={`block text-xs text-zinc-400 ${className ?? ''}`}>
      <span className="mb-1 block font-medium text-zinc-300">{label}</span>
      {children}
    </label>
  )
}

function LotList({ title, lots, valueUsd }: { title: string; lots: WholesaleInventoryLot[]; valueUsd: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-sm text-emerald-300">{formatUsd(valueUsd)}</span>
      </div>
      <ul className="mt-2 space-y-1 text-xs text-zinc-400">
        {lots.map((lot) => (
          <li key={lot.id} className="flex justify-between gap-2">
            <span className="truncate">{lot.title}</span>
            <span className="shrink-0">{formatUsd(Number(lot.estimatedValueUsd ?? 0))}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function MatchCard({
  match,
  alreadyPending,
}: {
  match: ReturnType<typeof orientProposal>
  alreadyPending: boolean
}) {
  const { proposal } = match
  const counterpartyLabel =
    match.counterpartyName || `Member ${match.counterpartyId.slice(0, 8)}`

  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Swap with {counterpartyLabel}</h3>
          <p className="text-xs text-zinc-500">
            {proposal.totalLots} lots · {proposal.totalUnits} cards · avg{' '}
            {proposal.averageAgeDays} days in inventory
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${scoreTone(proposal.turnoverScore)}`}
        >
          Turnover score {proposal.turnoverScore}
        </span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <LotList title="You send" lots={match.myLots} valueUsd={match.myValueUsd} />
        <LotList title="You receive" lots={match.theirLots} valueUsd={match.theirValueUsd} />
      </div>

      {proposal.cashEqualizationUsd > 0 && (
        <p className="mt-3 text-sm text-amber-200">
          {match.iPayCashEqualization ? 'You add' : `${counterpartyLabel} adds`}{' '}
          {formatUsd(proposal.cashEqualizationUsd)} to equalize the trade.
        </p>
      )}

      <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-zinc-400">
        {proposal.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>

      {alreadyPending ? (
        <p className="mt-4 text-sm text-zinc-500">
          A link-up with this member is already pending — see requests below.
        </p>
      ) : (
        <form action={requestLinkUpAction} className="mt-4 flex flex-wrap items-center gap-3">
          <input type="hidden" name="counterparty_user_id" value={match.counterpartyId} />
          <input type="hidden" name="proposal" value={JSON.stringify(proposal)} />
          <input
            type="text"
            name="message"
            placeholder="Optional note to your counterparty"
            className="min-w-56 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-emerald-400/50"
          />
          <button
            type="submit"
            className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Request link-up
          </button>
        </form>
      )}
    </div>
  )
}

function LinkupCard({
  linkup,
  currentUserId,
}: {
  linkup: TradeNetworkLinkupRow
  currentUserId: string
}) {
  const oriented = orientProposal(linkup.proposal, currentUserId)
  const iInitiated = linkup.initiated_by_user_id === currentUserId
  const counterpartyLabel =
    oriented.counterpartyName || `Member ${oriented.counterpartyId.slice(0, 8)}`
  const statusLabel = LINKUP_STATUS_LABELS[linkup.status] ?? linkup.status

  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">
            {iInitiated ? `Your request to ${counterpartyLabel}` : `Request from ${counterpartyLabel}`}
          </h3>
          <p className="text-xs text-zinc-500">
            {new Date(linkup.created_at).toLocaleDateString('en-CA', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
            {linkup.message ? ` · “${linkup.message}”` : ''}
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            linkup.status === 'accepted'
              ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
              : linkup.status === 'pending'
                ? 'border-amber-400/20 bg-amber-400/10 text-amber-200'
                : 'border-white/10 bg-white/5 text-zinc-400'
          }`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <LotList title="You send" lots={oriented.myLots} valueUsd={oriented.myValueUsd} />
        <LotList title="You receive" lots={oriented.theirLots} valueUsd={oriented.theirValueUsd} />
      </div>

      {linkup.proposal.cashEqualizationUsd > 0 && (
        <p className="mt-3 text-sm text-amber-200">
          {oriented.iPayCashEqualization ? 'You add' : `${counterpartyLabel} adds`}{' '}
          {formatUsd(linkup.proposal.cashEqualizationUsd)} to equalize the trade.
        </p>
      )}

      {linkup.status === 'accepted' && (
        <p className="mt-3 text-sm text-emerald-200">
          Link-up accepted — coordinate shipping and finalize the swap with{' '}
          {counterpartyLabel}.
        </p>
      )}

      {linkup.status === 'pending' && (
        <div className="mt-4 flex gap-3">
          {iInitiated ? (
            <form action={respondLinkUpAction}>
              <input type="hidden" name="linkup_id" value={linkup.id} />
              <input type="hidden" name="next_status" value="withdrawn" />
              <button
                type="submit"
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium hover:bg-white/10"
              >
                Withdraw
              </button>
            </form>
          ) : (
            <>
              <form action={respondLinkUpAction}>
                <input type="hidden" name="linkup_id" value={linkup.id} />
                <input type="hidden" name="next_status" value="accepted" />
                <button
                  type="submit"
                  className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  Accept
                </button>
              </form>
              <form action={respondLinkUpAction}>
                <input type="hidden" name="linkup_id" value={linkup.id} />
                <input type="hidden" name="next_status" value="declined" />
                <button
                  type="submit"
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium hover:bg-white/10"
                >
                  Decline
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  )
}
