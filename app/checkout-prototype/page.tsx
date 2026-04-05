import {
  calculateEscrowPrototype,
  ESCROW_EXAMPLES,
  type SupportedCountry,
} from '@/lib/escrow/prototype'
import { AdminOnlyCallout } from '@/components/admin-only-callout'
import { getAdminAccessForUser } from '@/lib/admin/access'
import { createClient } from '@/lib/supabase/server'
import { createTradeDraftAction } from './actions'
import Link from 'next/link'

function formatUsd(value: number) {
  return `$${value.toFixed(2)}`
}

function parseMoney(value: string | string[] | undefined, fallback: number) {
  const candidate = Array.isArray(value) ? value[0] : value
  const parsed = Number(candidate)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function parseCountry(
  value: string | string[] | undefined,
  fallback: SupportedCountry
): SupportedCountry {
  const candidate = (Array.isArray(value) ? value[0] : value)?.toLowerCase()
  return candidate === 'ca' || candidate === 'us' ? candidate : fallback
}

function parseBoolean(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value
  return candidate === '1' || candidate === 'true' || candidate === 'on'
}

function sideLabel(code: SupportedCountry) {
  return code === 'ca' ? 'Canada' : 'USA'
}

export default async function CheckoutPrototypePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = searchParams ? await searchParams : {}
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = await getAdminAccessForUser(user)
  const deckAValue = parseMoney(params.deckAValue, 1000)
  const deckBValue = parseMoney(params.deckBValue, 1000)
  const countryA = parseCountry(params.countryA, 'ca')
  const countryB = parseCountry(params.countryB, 'ca')
  const boxKitA = parseBoolean(params.boxKitA)
  const boxKitB = parseBoolean(params.boxKitB)
  const schemaMissing = params.schemaMissing === '1'
  const saveError = params.saveError === '1'

  const result = calculateEscrowPrototype({
    deckAValue,
    deckBValue,
    countryA,
    countryB,
    boxKitA,
    boxKitB,
  })

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <Link
            href="/info"
            className="inline-block rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10"
          >
            {'<-'} Back to info
          </Link>

          <div className="mt-8 max-w-4xl">
            <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-300">
              Escrow Checkout Prototype
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              Model the exact money flow before Stripe is wired in
            </h1>
            <p className="mt-4 max-w-3xl text-lg text-zinc-400">
              This prototype shows how a value-for-value deck trade can settle with shipping,
              insurance, DeckSwap&apos;s fee, and any equalization payment without forcing both
              sides to escrow the full cash value of their decks.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <form className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">Trade Inputs</h2>
                  <p className="mt-2 text-sm text-zinc-400">
                    Adjust deck values and lane assumptions to preview the checkout total for each
                    side.
                  </p>
                </div>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-medium text-zinc-950 hover:opacity-90"
                >
                  Recalculate
                </button>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="text-sm font-medium text-white">User A</div>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="mb-2 block text-sm text-zinc-400">Deck value</label>
                      <input
                        name="deckAValue"
                        defaultValue={deckAValue}
                        inputMode="decimal"
                        className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-emerald-400/40"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm text-zinc-400">Ship from</label>
                      <select
                        name="countryA"
                        defaultValue={countryA}
                        style={{ colorScheme: 'dark' }}
                        className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-emerald-400/40"
                      >
                        <option value="ca" className="bg-zinc-900 text-white">
                          Canada
                        </option>
                        <option value="us" className="bg-zinc-900 text-white">
                          USA
                        </option>
                      </select>
                    </div>
                    <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
                      <input type="checkbox" name="boxKitA" value="1" defaultChecked={boxKitA} className="mt-1" />
                      <span>Courier me a flat folded box with a prepaid label for this side (+$20)</span>
                    </label>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="text-sm font-medium text-white">User B</div>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="mb-2 block text-sm text-zinc-400">Deck value</label>
                      <input
                        name="deckBValue"
                        defaultValue={deckBValue}
                        inputMode="decimal"
                        className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-emerald-400/40"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm text-zinc-400">Ship from</label>
                      <select
                        name="countryB"
                        defaultValue={countryB}
                        style={{ colorScheme: 'dark' }}
                        className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-emerald-400/40"
                      >
                        <option value="ca" className="bg-zinc-900 text-white">
                          Canada
                        </option>
                        <option value="us" className="bg-zinc-900 text-white">
                          USA
                        </option>
                      </select>
                    </div>
                    <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
                      <input type="checkbox" name="boxKitB" value="1" defaultChecked={boxKitB} className="mt-1" />
                      <span>Courier me a flat folded box with a prepaid label for this side (+$20)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {ESCROW_EXAMPLES.map((example) => (
                  <Link
                    key={example.slug}
                    href={`/checkout-prototype?deckAValue=${example.input.deckAValue}&deckBValue=${example.input.deckBValue}&countryA=${example.input.countryA}&countryB=${example.input.countryB}`}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300 hover:bg-white/10"
                  >
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Example</div>
                    <div className="mt-2 font-medium text-white">{example.title}</div>
                    <div className="mt-1 text-zinc-400">
                      {sideLabel(example.input.countryA)} lane
                    </div>
                  </Link>
                ))}
              </div>
            </form>

            {(schemaMissing || saveError) && (
              <div
                className={`rounded-3xl border p-5 text-sm ${
                  schemaMissing
                    ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-100'
                    : 'border-red-500/20 bg-red-500/10 text-red-100'
                }`}
              >
                {schemaMissing
                  ? 'Persistent trade tables are not in Supabase yet. Run docs/sql/escrow-transaction-foundation.sql before creating drafts from this page.'
                  : 'Something went wrong while creating the trade draft. The calculator still works, but the transaction record was not saved.'}
              </div>
            )}

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">Checkout Summary</h2>
                  <p className="mt-2 text-sm text-zinc-400">
                    Each user prepays only what DeckSwap must control: fee, shipping, insurance,
                    and any equalization owed.
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
                  Lane: {result.lane}
                </div>
              </div>

              {!result.supported && (
                <div className="mt-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-100">
                  This prototype only prices domestic lanes cleanly right now. Cross-border logic
                  still needs separate shipping, customs, and support rules.
                </div>
              )}

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-lg font-semibold text-white">User A Due Now</div>
                    <div className="text-2xl font-semibold text-emerald-300">
                      {formatUsd(result.deckA.amountDue)}
                    </div>
                  </div>
                  <div className="mt-4 space-y-3 text-sm text-zinc-300">
                    <div className="flex items-center justify-between">
                      <span>Deck value</span>
                      <span>{formatUsd(result.deckA.deckValue)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Matching fee</span>
                      <span>{formatUsd(result.deckA.matchingFee)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Shipping</span>
                      <span>{formatUsd(result.deckA.shipping)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Insurance</span>
                      <span>{formatUsd(result.deckA.insurance)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Box kit + label</span>
                      <span>{formatUsd(result.deckA.packaging)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Equalization owed</span>
                      <span>{formatUsd(result.deckA.equalizationOwed)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-lg font-semibold text-white">User B Due Now</div>
                    <div className="text-2xl font-semibold text-emerald-300">
                      {formatUsd(result.deckB.amountDue)}
                    </div>
                  </div>
                  <div className="mt-4 space-y-3 text-sm text-zinc-300">
                    <div className="flex items-center justify-between">
                      <span>Deck value</span>
                      <span>{formatUsd(result.deckB.deckValue)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Matching fee</span>
                      <span>{formatUsd(result.deckB.matchingFee)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Shipping</span>
                      <span>{formatUsd(result.deckB.shipping)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Insurance</span>
                      <span>{formatUsd(result.deckB.insurance)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Box kit + label</span>
                      <span>{formatUsd(result.deckB.packaging)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Equalization owed</span>
                      <span>{formatUsd(result.deckB.equalizationOwed)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="text-sm text-zinc-400">Equalization Payment</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {formatUsd(result.equalizationAmount)}
                  </div>
                  <p className="mt-2 text-sm text-zinc-400">
                    {result.equalizationRecipient === 'a'
                      ? 'Released to User A after both decks clear inspection.'
                      : result.equalizationRecipient === 'b'
                        ? 'Released to User B after both decks clear inspection.'
                        : 'No equalization is needed for this trade.'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="text-sm text-zinc-400">Platform Gross</div>
                  <div className="mt-2 text-2xl font-semibold text-emerald-300">
                    {formatUsd(result.platformGross)}
                  </div>
                  <p className="mt-2 text-sm text-zinc-400">
                    Shipping, insurance, and DeckSwap fees collected before release.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="text-sm text-zinc-400">Escrow Principle</div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    Hold decks, not full cash value
                  </div>
                  <p className="mt-2 text-sm text-zinc-400">
                    That keeps the trade capital-light while preserving a real trust layer.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Operational Notes</h2>
              <div className="mt-4 space-y-3 text-sm text-zinc-300">
                {result.notes.map((note) => (
                  <p
                    key={note}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    {note}
                  </p>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Payment Method</h2>
              <p className="mt-2 text-sm text-zinc-400">
                {access.isAdmin
                  ? 'Internal prototype controls for testing the planned checkout flow.'
                  : 'Payment collection details are intentionally hidden in the public prototype.'}
              </p>

              {access.isAdmin ? (
                <AdminOnlyCallout
                  className="mt-6"
                  title="Prototype payment controls"
                  description="These testing reminders and implementation placeholders are hidden from non-admin users."
                >
                  <div className="space-y-3">
                    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                      <input type="radio" name="payment-method" defaultChecked className="mt-1" />
                      <div>
                        <div className="font-medium text-white">Saved test card</div>
                        <div className="mt-1 text-sm text-zinc-400">
                          Dummy Visa ending in 4242 for prototype review only.
                        </div>
                      </div>
                    </label>

                    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                      <input type="radio" name="payment-method" className="mt-1" />
                      <div>
                        <div className="font-medium text-white">Bank transfer placeholder</div>
                        <div className="mt-1 text-sm text-zinc-400">
                          Useful later for higher-value escrow lanes.
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-zinc-950/70 p-4">
                    <div className="text-sm font-medium text-white">Stripe Integration Placeholder</div>
                    <p className="mt-2 text-sm text-zinc-400">
                      Future state: create one payment intent per user for `amount_due`, support
                      separate capture/release states, and link settlement to physical deck inspection.
                    </p>
                  </div>
                </AdminOnlyCallout>
              ) : (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
                  Final payment handling will be shown only when this flow is ready for public use.
                </div>
              )}

              <form action={createTradeDraftAction} className="mt-6 space-y-3">
                <input type="hidden" name="deckAValue" value={deckAValue} />
                <input type="hidden" name="deckBValue" value={deckBValue} />
                <input type="hidden" name="countryA" value={countryA} />
                <input type="hidden" name="countryB" value={countryB} />
                <input type="hidden" name="boxKitA" value={boxKitA ? '1' : '0'} />
                <input type="hidden" name="boxKitB" value={boxKitB ? '1' : '0'} />
                <button
                  className="w-full rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90"
                >
                  Create Draft Transaction
                </button>
              </form>

              <p className="mt-3 text-center text-xs text-zinc-500">
                This now persists a draft trade foundation, but no real payment is processed yet.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Release Logic</h2>
              <div className="mt-4 space-y-3 text-sm text-zinc-300">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  1. Both users prepay fee, shipping, insurance, and any equalization owed.
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  2. Both decks arrive at DeckSwap and are checked against the agreed inventory.
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  3. DeckSwap forwards each approved deck and releases any equalization payment to
                  the side that traded down in value.
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Condition Checks and Arbitration</h2>
              <div className="mt-4 space-y-3 text-sm text-zinc-300">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  Sellers should grade cards before listing under Near Mint, Light Play, Moderate Play, Heavy Play, or Damaged, using the lowest honest grade when a card is borderline.
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  During escrow, DeckSwap compares the received deck against the saved inventory, declared conditions, and any agreed packaging notes before release.
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  If a card arrives materially below the listed condition, settlement pauses while support reviews photos, timestamps, and the transaction record to decide whether to proceed, adjust value, or return inventory.
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold">Foundation Status</h2>
              <div className="mt-4 space-y-3 text-sm text-zinc-300">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  Draft transactions can now be stored with participant obligations.
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  Event history is recorded from the moment a trade draft is created.
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  Next up is mapping draft obligations into real payment intents and shipment states.
                </div>
              </div>
              <Link
                href="/trades"
                className="mt-5 inline-block rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
              >
                View Trades Workspace
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
