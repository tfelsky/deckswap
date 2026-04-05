import Link from 'next/link'
import { redirect } from 'next/navigation'
import FormActionButton from '@/components/form-action-button'
import { getAdminAccessForUser } from '@/lib/admin/access'
import {
  cardsRequiringWarehouseConditionReview,
  formatConditionLabel,
  summarizeWarehouseInspection,
  WAREHOUSE_CONDITION_THRESHOLD_USD,
  HIGH_VALUE_AUTHENTICITY_THRESHOLD_USD,
  type AuthenticityResult,
  type WarehouseDeckCard,
} from '@/lib/admin/warehouse-intake'
import {
  CARD_CONDITION_DETAILS,
  CARD_CONDITIONS,
  normalizeCardCondition,
} from '@/lib/decks/conditions'
import { createAdminClientOrNull } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type TradeRow = {
  id: number
  status: string
  release_ready_at?: string | null
  dispute_reason?: string | null
}

type ParticipantRow = {
  transaction_id: number
  side: 'a' | 'b'
  deck_id?: number | null
  shipment_status?: string | null
  inspection_status?: string | null
  inspection_notes?: string | null
  received_at?: string | null
}

type DeckRow = {
  id: number
  name?: string | null
  commander?: string | null
  inventory_status?: string | null
}

function formatUsd(value?: number | null) {
  return `$${Number(value ?? 0).toFixed(2)}`
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

function deckLabel(deck?: DeckRow | null) {
  if (deck?.name?.trim()) return deck.name.trim()
  if (deck?.commander?.trim()) return deck.commander.trim()
  if (deck?.id) return `Deck #${deck.id}`
  return 'Deck'
}

export default async function AdminWarehouseIntakePage({
  params,
}: {
  params: Promise<{ tradeId: string; side: string }>
}) {
  const { tradeId: tradeIdParam, side: sideParam } = await params
  const tradeId = Number(tradeIdParam)
  const side = sideParam === 'a' || sideParam === 'b' ? sideParam : null

  if (!Number.isFinite(tradeId) || !side) {
    redirect('/admin/logistics')
  }

  const supabase = await createClient()
  const adminSupabase = createAdminClientOrNull() ?? supabase
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/sign-in')

  const access = await getAdminAccessForUser(user)
  if (!access.isAdmin) redirect('/decks')

  const [tradeResult, participantResult] = await Promise.all([
    adminSupabase
      .from('trade_transactions')
      .select('id, status, release_ready_at, dispute_reason')
      .eq('id', tradeId)
      .maybeSingle(),
    adminSupabase
      .from('trade_transaction_participants')
      .select(
        'transaction_id, side, deck_id, shipment_status, inspection_status, inspection_notes, received_at'
      )
      .eq('transaction_id', tradeId)
      .eq('side', side)
      .maybeSingle(),
  ])

  const trade = (tradeResult.data ?? null) as TradeRow | null
  const participant = (participantResult.data ?? null) as ParticipantRow | null

  if (!trade || !participant || !participant.deck_id) {
    redirect('/trades')
  }

  if (participant.shipment_status !== 'received') {
    redirect(`/trades/${tradeId}`)
  }

  const [deckResult, cardsResult] = await Promise.all([
    adminSupabase
      .from('decks')
      .select('id, name, commander, inventory_status')
      .eq('id', participant.deck_id)
      .maybeSingle(),
    adminSupabase
      .from('deck_cards')
      .select(
        'id, quantity, card_name, set_name, set_code, collector_number, condition, price_usd, price_usd_foil, price_usd_etched, foil'
      )
      .eq('deck_id', participant.deck_id)
      .order('sort_order', { ascending: true }),
  ])

  const deck = (deckResult.data ?? null) as DeckRow | null
  const cards = (cardsResult.data ?? []) as WarehouseDeckCard[]
  const reviewCards = cardsRequiringWarehouseConditionReview(cards)

  async function submitWarehouseInspectionAction(formData: FormData) {
    'use server'

    const supabase = await createClient()
    const adminSupabase = createAdminClientOrNull() ?? supabase
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect('/sign-in')

    const access = await getAdminAccessForUser(user)
    if (!access.isAdmin) redirect('/decks')

    const tradeId = Number(formData.get('trade_id'))
    const side = String(formData.get('side') || '') as 'a' | 'b'
    if (!Number.isFinite(tradeId) || (side !== 'a' && side !== 'b')) {
      redirect('/admin/logistics')
    }

    const [tradeResult, participantResult] = await Promise.all([
      adminSupabase
        .from('trade_transactions')
        .select('id, status, release_ready_at, dispute_reason')
        .eq('id', tradeId)
        .maybeSingle(),
      adminSupabase
        .from('trade_transaction_participants')
        .select('transaction_id, side, deck_id, shipment_status')
        .eq('transaction_id', tradeId)
        .eq('side', side)
        .maybeSingle(),
    ])

    const trade = tradeResult.data as TradeRow | null
    const participant = participantResult.data as
      | { transaction_id: number; side: 'a' | 'b'; deck_id?: number | null; shipment_status?: string | null }
      | null

    if (!trade || !participant?.deck_id || participant.shipment_status !== 'received') {
      redirect(`/trades/${tradeId}`)
    }

    const cardsResult = await adminSupabase
      .from('deck_cards')
      .select(
        'id, quantity, card_name, set_name, set_code, collector_number, condition, price_usd, price_usd_foil, price_usd_etched, foil'
      )
      .eq('deck_id', participant.deck_id)
      .order('sort_order', { ascending: true })

    const cards = (cardsResult.data ?? []) as WarehouseDeckCard[]
    const reviewCards = cardsRequiringWarehouseConditionReview(cards)

    const cardInputs = reviewCards.map((card) => {
      const authenticityValue = String(formData.get(`authenticity_${card.id}`) || 'authentic')
      const authenticityResult: AuthenticityResult =
        authenticityValue === 'needs_review' || authenticityValue === 'suspect'
          ? authenticityValue
          : 'authentic'

      return {
        cardId: card.id,
        inspectedCondition: normalizeCardCondition(
          String(formData.get(`condition_${card.id}`) || card.condition || 'near_mint')
        ),
        authenticityResult,
        issueNote: String(formData.get(`issue_${card.id}`) || '').trim() || null,
      }
    })

    const summary = summarizeWarehouseInspection(cards, {
      sealIntact: formData.get('seal_intact') === 'on',
      sleeveConditionOk: formData.get('sleeve_condition_ok') === 'on',
      boxConditionOk: formData.get('box_condition_ok') === 'on',
      contentsVerified: formData.get('contents_verified') === 'on',
      intakeNotes: String(formData.get('intake_notes') || '').trim() || null,
      cardInputs,
    })

    const noteLines = [
      `Warehouse intake completed on ${new Date().toLocaleString('en-CA')}.`,
      `Checklist complete: ${summary.checklistComplete ? 'yes' : 'no'}.`,
      `Condition-adjusted value: ${formatUsd(summary.totalAdjustedValueUsd)} from ${formatUsd(
        summary.totalExpectedValueUsd
      )}.`,
      `Condition discrepancy: ${formatUsd(summary.discrepancyUsd)}.`,
      `High-value authenticity flags: ${summary.highValueAuthenticityFlags}.`,
      ...summary.deckLevelFlags.map((flag) => `Flag: ${flag}`),
      ...summary.cardResults
        .filter((card) => card.needsReview)
        .slice(0, 8)
        .map(
          (card) =>
            `${card.cardName}: ${formatConditionLabel(
              card.expectedCondition
            )} -> ${formatConditionLabel(card.inspectedCondition)}, ${
              card.authenticityResult
            }, delta ${formatUsd(card.discrepancyUsd)}${
              card.issueNote ? `, note: ${card.issueNote}` : ''
            }`
        ),
      String(formData.get('intake_notes') || '').trim() || null,
    ].filter(Boolean)

    const inspectionNotes = noteLines.join('\n')
    const now = new Date().toISOString()

    await adminSupabase
      .from('trade_transaction_participants')
      .update({
        inspection_status: summary.status,
        inspection_notes: inspectionNotes,
        updated_at: now,
      })
      .eq('transaction_id', tradeId)
      .eq('side', side)

    const otherParticipantsResult = await adminSupabase
      .from('trade_transaction_participants')
      .select('side, payment_status, shipment_status, inspection_status')
      .eq('transaction_id', tradeId)
      .order('side', { ascending: true })

    const participants = (otherParticipantsResult.data ?? []) as Array<{
      side: 'a' | 'b'
      payment_status?: 'unpaid' | 'authorized' | 'paid' | 'refunded' | null
      shipment_status?: 'not_shipped' | 'shipped' | 'received' | null
      inspection_status?: 'pending' | 'passed' | 'failed' | null
    }>

    const participantsWithCurrent = participants.map((row) =>
      row.side === side ? { ...row, inspection_status: summary.status } : row
    )
    const allPaid =
      participantsWithCurrent.length > 0 &&
      participantsWithCurrent.every((item) => item.payment_status === 'paid')
    const allReceived =
      participantsWithCurrent.length > 0 &&
      participantsWithCurrent.every((item) => item.shipment_status === 'received')
    const anyFailed = participantsWithCurrent.some(
      (item) => item.inspection_status === 'failed'
    )
    const allPassed =
      participantsWithCurrent.length > 0 &&
      participantsWithCurrent.every((item) => item.inspection_status === 'passed')

    let nextStatus = trade.status
    if (anyFailed) {
      nextStatus = 'disputed'
    } else if (allReceived && allPassed) {
      nextStatus = 'ready_to_release'
    } else if (allReceived) {
      nextStatus = 'in_inspection'
    } else if (allPaid) {
      nextStatus = 'awaiting_shipments'
    }

    await adminSupabase
      .from('trade_transactions')
      .update({
        status: nextStatus,
        release_ready_at: nextStatus === 'ready_to_release' ? now : null,
        dispute_reason:
          summary.status === 'failed'
            ? `Warehouse intake flagged issues for side ${side.toUpperCase()}.`
            : trade.dispute_reason ?? null,
        updated_at: now,
      })
      .eq('id', tradeId)

    await adminSupabase
      .from('decks')
      .update({
        inventory_status: summary.status === 'failed' ? 'escrow_review' : 'escrow_received',
      })
      .eq('id', participant.deck_id)

    await adminSupabase.from('escrow_events').insert({
      transaction_id: tradeId,
      actor_user_id: user.id,
      event_type:
        summary.status === 'failed'
          ? 'warehouse_intake_flagged'
          : 'warehouse_intake_passed',
      event_data: {
        side,
        checklistComplete: summary.checklistComplete,
        discrepancyUsd: summary.discrepancyUsd,
        highValueAuthenticityFlags: summary.highValueAuthenticityFlags,
        deckLevelFlags: summary.deckLevelFlags,
        cardResults: summary.cardResults,
      },
    })

    redirect(`/trades/${tradeId}`)
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-10 text-white">
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/trades/${tradeId}`}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10"
        >
          {'<-'} Back to trade review
        </Link>
        <Link
          href="/admin/logistics"
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
        >
          Open logistics map
        </Link>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
          <div className="inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-medium tracking-wide text-amber-200">
            Employee Intake
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">{deckLabel(deck)}</h1>
          <p className="mt-3 max-w-3xl text-zinc-400">
            Received at warehouse on {formatTimestamp(participant.received_at)}. Complete the
            intake checklist, inspect every card over{' '}
            {formatUsd(WAREHOUSE_CONDITION_THRESHOLD_USD)}, and escalate higher-value
            authenticity issues automatically.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Trade</div>
              <div className="mt-2 text-2xl font-semibold">#{trade.id}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Side</div>
              <div className="mt-2 text-2xl font-semibold">{side.toUpperCase()}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Cards Requiring Rating</div>
              <div className="mt-2 text-2xl font-semibold text-emerald-300">
                {reviewCards.length}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
          <h2 className="text-2xl font-semibold">Required Checks</h2>
          <div className="mt-4 space-y-3 text-sm text-zinc-300">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              1. Confirm the shipment was physically received and contents are complete.
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              2. Inspect sleeves and outer box for mismatch, moisture, crushing, or swap
              concerns.
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              3. Rate every card at or above {formatUsd(WAREHOUSE_CONDITION_THRESHOLD_USD)}
              against the saved condition.
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              4. Any card at or above {formatUsd(HIGH_VALUE_AUTHENTICITY_THRESHOLD_USD)} with
              authenticity concern will automatically hold the trade for review.
            </div>
          </div>
        </div>
      </div>

      <form action={submitWarehouseInspectionAction} className="mt-6 space-y-6">
        <input type="hidden" name="trade_id" value={trade.id} />
        <input type="hidden" name="side" value={side} />

        <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
          <h2 className="text-2xl font-semibold">Arrival Checklist</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-200">
              <input
                type="checkbox"
                name="seal_intact"
                className="mt-1 h-4 w-4 accent-emerald-400"
                defaultChecked
              />
              <span>External seal or tamper condition looked acceptable on arrival.</span>
            </label>
            <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-200">
              <input
                type="checkbox"
                name="contents_verified"
                className="mt-1 h-4 w-4 accent-emerald-400"
                defaultChecked
              />
              <span>Deck contents were checked against the stored deck list before release.</span>
            </label>
            <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-200">
              <input
                type="checkbox"
                name="sleeve_condition_ok"
                className="mt-1 h-4 w-4 accent-emerald-400"
                defaultChecked
              />
              <span>
                Sleeves are in acceptable condition with no significant grime, splits, or
                mismatch.
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-200">
              <input
                type="checkbox"
                name="box_condition_ok"
                className="mt-1 h-4 w-4 accent-emerald-400"
                defaultChecked
              />
              <span>Deck box, storage case, and packaging arrived intact and usable.</span>
            </label>
          </div>

          <label className="mt-5 block text-sm text-zinc-400">Intake notes</label>
          <textarea
            name="intake_notes"
            rows={4}
            placeholder="Summarize packaging condition, unusual findings, missing contents, or what should happen next."
            className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 p-4 text-sm text-white"
          />
        </div>

        <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Cards Over $5</h2>
              <p className="mt-2 max-w-3xl text-sm text-zinc-400">
                These cards can change settlement value. Compare the inspected condition to the
                stored condition and record any authenticity concern.
              </p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-zinc-300">
              {reviewCards.length} cards to rate
            </div>
          </div>

          {reviewCards.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-zinc-400">
              No cards crossed the review threshold, so the checklist can focus on packaging and
              completeness.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {reviewCards.map((card) => (
                <div key={card.id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold text-white">{card.card_name}</div>
                      <div className="mt-1 text-sm text-zinc-400">
                        {card.set_name || card.set_code || 'Unknown set'}
                        {card.collector_number ? ` #${card.collector_number}` : ''}
                        {' | '}Qty {card.quantity}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-semibold text-emerald-300">
                        {formatUsd(card.marketValueUsd)}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {card.marketValueUsd >= HIGH_VALUE_AUTHENTICITY_THRESHOLD_USD
                          ? 'Higher-value authenticity required'
                          : 'Condition-rated card'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[0.8fr_0.8fr_1fr]">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-xs uppercase tracking-wide text-zinc-500">
                        Stored Condition
                      </div>
                      <div className="mt-2 text-white">{formatConditionLabel(card.condition)}</div>
                      <div className="mt-2 text-xs text-zinc-500">
                        {CARD_CONDITION_DETAILS[
                          card.condition && card.condition in CARD_CONDITION_DETAILS
                            ? (card.condition as keyof typeof CARD_CONDITION_DETAILS)
                            : 'near_mint'
                        ].description}
                      </div>
                    </div>

                    <label className="block rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-xs uppercase tracking-wide text-zinc-500">
                        Inspected Condition
                      </div>
                      <select
                        name={`condition_${card.id}`}
                        defaultValue={card.condition ?? 'near_mint'}
                        className="mt-3 w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-white"
                      >
                        {CARD_CONDITIONS.slice().reverse().map((condition) => (
                          <option key={condition} value={condition}>
                            {CARD_CONDITION_DETAILS[condition].label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-xs uppercase tracking-wide text-zinc-500">
                        Authenticity
                      </div>
                      <select
                        name={`authenticity_${card.id}`}
                        defaultValue="authentic"
                        className="mt-3 w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-white"
                      >
                        <option value="authentic">Authentic</option>
                        <option value="needs_review">Needs review</option>
                        <option value="suspect">Suspect</option>
                      </select>
                      <textarea
                        name={`issue_${card.id}`}
                        rows={3}
                        placeholder="Optional issue note for whitening, surface wear, print concern, or authenticity hold."
                        className="mt-3 w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-zinc-900 p-6">
          <div className="max-w-3xl text-sm text-zinc-400">
            Passing the intake keeps the trade moving. Any higher-value authenticity issue or
            incomplete contents will automatically flag the deck for review and hold release.
          </div>
          <FormActionButton
            pendingLabel="Saving intake..."
            className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
          >
            Save warehouse intake
          </FormActionButton>
        </div>
      </form>
    </section>
  )
}
