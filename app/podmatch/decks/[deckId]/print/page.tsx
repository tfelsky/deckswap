import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDeckScore } from '@/lib/podmatch/decks'
import type { RuleZeroProfile } from '@/lib/podmatch/rule-zero'
import PrintButton from '@/components/podmatch/print-button'

export const dynamic = 'force-dynamic'

type ChecklistCard = {
  card_name: string
  section: string
  quantity: number
  set_code: string | null
  collector_number: string | null
}

const SECTION_ORDER: Record<string, number> = {
  commander: 0,
  mainboard: 1,
  sideboard: 2,
  token: 3,
}

export default async function PodMatchPrintPage({
  params,
}: {
  params: Promise<{ deckId: string }>
}) {
  const { deckId: deckIdParam } = await params
  const deckId = Number(deckIdParam)
  if (!Number.isFinite(deckId) || deckId <= 0) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: deck } = await supabase
    .from('decks')
    .select('id, name, commander, user_id')
    .eq('id', deckId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!deck) notFound()

  const { data: cardData } = await supabase
    .from('deck_cards')
    .select('card_name, section, quantity, set_code, collector_number')
    .eq('deck_id', deckId)

  const cards = ((cardData ?? []) as ChecklistCard[])
    .filter((card) => card.section !== 'token')
    .sort((a, b) => {
      const sa = SECTION_ORDER[a.section] ?? 1
      const sb = SECTION_ORDER[b.section] ?? 1
      if (sa !== sb) return sa - sb
      return a.card_name.localeCompare(b.card_name)
    })

  const { score } = await getDeckScore(supabase, deckId)
  const ruleZero = (score?.rule_zero as RuleZeroProfile | null) ?? null

  return (
    <main className="min-h-screen bg-white px-8 py-8 text-zinc-900 print:px-0 print:py-0">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between print:hidden">
          <Link href={`/podmatch/decks/${deckId}`} className="text-sm text-zinc-500 hover:text-zinc-900">
            ← Back to analysis
          </Link>
          <PrintButton />
        </div>

        <header className="mt-6 border-b border-zinc-300 pb-4">
          <h1 className="text-2xl font-bold">{deck.name}</h1>
          {deck.commander ? (
            <p className="text-sm text-zinc-600">Commander: {deck.commander}</p>
          ) : null}
        </header>

        {/* Rule-zero sheet */}
        {ruleZero ? (
          <section className="mt-6">
            <h2 className="text-lg font-semibold">Rule-Zero summary</h2>
            <table className="mt-3 w-full text-sm">
              <tbody>
                <RZRow label="Estimated power" value={String(ruleZero.estimated_power)} />
                <RZRow label="Speed" value={ruleZero.speed_band} />
                <RZRow label="Tutors" value={ruleZero.tutor_band} />
                <RZRow label="Salt" value={ruleZero.salt_band} />
                <RZRow
                  label="Combos"
                  value={
                    ruleZero.combo.present
                      ? `Yes — ${ruleZero.combo.count} known line${ruleZero.combo.count === 1 ? '' : 's'}${ruleZero.combo.pieces.length ? ` (${ruleZero.combo.pieces.slice(0, 4).join(', ')})` : ''}`
                      : 'None detected'
                  }
                />
                <RZRow label="Proxies" value={ruleZero.proxy_use} />
                <RZRow
                  label="Estimated value"
                  value={
                    ruleZero.estimated_value_usd > 0
                      ? `~$${ruleZero.estimated_value_usd.toLocaleString('en-US')}`
                      : 'Unknown'
                  }
                />
              </tbody>
            </table>
            {ruleZero.flags.length ? (
              <p className="mt-3 text-sm">
                <span className="font-semibold">Flags:</span> {ruleZero.flags.join(' · ')}
              </p>
            ) : null}
            <p className="mt-2 text-sm text-zinc-700">{ruleZero.notes}</p>
          </section>
        ) : (
          <p className="mt-6 text-sm text-zinc-600">
            This deck has not been scored yet — open the analysis page and run the scorer
            to include a rule-zero summary here.
          </p>
        )}

        {/* Deck checklist */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Deck checklist</h2>
          <ul className="mt-3 columns-1 gap-8 text-sm sm:columns-2">
            {cards.map((card, i) => {
              const printing =
                card.set_code || card.collector_number
                  ? ` — ${card.set_code ? card.set_code.toUpperCase() : ''}${card.collector_number ? ` #${card.collector_number}` : ''}`.trimEnd()
                  : ''
              return (
                <li key={`${card.card_name}-${i}`} className="break-inside-avoid py-0.5">
                  <span className="mr-2 inline-block align-middle">☐</span>
                  {card.quantity} {card.card_name}
                  <span className="text-zinc-500">{printing}</span>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </main>
  )
}

function RZRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-zinc-200">
      <td className="py-1.5 pr-4 font-medium text-zinc-600">{label}</td>
      <td className="py-1.5">{value}</td>
    </tr>
  )
}
