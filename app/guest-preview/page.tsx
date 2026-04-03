'use client'

import { getCommanderBracketSummary } from '@/lib/commander/brackets'
import { parseDeckText } from '@/lib/commander/parse'
import { validateDeckForFormat } from '@/lib/commander/validate'
import { detectDeckFormat, getDeckFormatLabel, normalizeDeckFormat } from '@/lib/decks/formats'
import { GUEST_IMPORT_DRAFT_KEY, type GuestImportDraft } from '@/lib/guest-import'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type PreviewCard = {
  id: number
  section: 'commander' | 'mainboard' | 'token'
  quantity: number
  cardName: string
  setCode?: string
  collectorNumber?: string
}

function formatPrint(card: PreviewCard) {
  const parts = []
  if (card.setCode) parts.push(card.setCode.toUpperCase())
  if (card.collectorNumber) parts.push(`#${card.collectorNumber}`)
  return parts.join(' • ')
}

export default function GuestPreviewPage() {
  const [draft, setDraft] = useState<GuestImportDraft | null>(null)

  useEffect(() => {
    const raw = window.sessionStorage.getItem(GUEST_IMPORT_DRAFT_KEY)
    if (!raw) return

    try {
      setDraft(JSON.parse(raw) as GuestImportDraft)
    } catch {
      setDraft(null)
    }
  }, [])

  const parsed = useMemo(() => {
    if (!draft) return []
    return parseDeckText(draft.rawList, draft.sourceType).map((card, index) => ({
      id: index + 1,
      section: card.section,
      quantity: card.quantity,
      cardName: card.cardName,
      setCode: card.setCode,
      collectorNumber: card.collectorNumber,
    }))
  }, [draft])

  const detectedFormat = normalizeDeckFormat(detectDeckFormat(
    parsed.map((card) => ({
      section: card.section,
      quantity: card.quantity,
      cardName: card.cardName,
      setCode: card.setCode,
      collectorNumber: card.collectorNumber,
    })),
    null
  ))

  const validation = validateDeckForFormat(
    parsed.map((card) => ({
      section: card.section,
      quantity: card.quantity,
      cardName: card.cardName,
      setCode: card.setCode,
      collectorNumber: card.collectorNumber,
    })),
    detectedFormat
  )

  const bracket = getCommanderBracketSummary(
    parsed.map((card) => ({
      section: card.section,
      quantity: card.quantity,
      card_name: card.cardName,
    }))
  )

  const commanders = parsed.filter((card) => card.section === 'commander')
  const mainboard = parsed.filter((card) => card.section === 'mainboard')
  const tokens = parsed.filter((card) => card.section === 'token')
  const totalCards = parsed.reduce((sum, card) => sum + card.quantity, 0)

  if (!draft) {
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-zinc-900 p-8">
          <h1 className="text-3xl font-semibold">No guest preview loaded</h1>
          <p className="mt-3 text-zinc-400">
            Start from the guest import page to create a temporary sandbox deck preview.
          </p>
          <Link
            href="/guest-import"
            className="mt-6 inline-block rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90"
          >
            Open guest import
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/guest-import"
              className="inline-block rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10"
            >
              {'<-'} Edit preview
            </Link>
            <Link
              href="/sign-in"
              className="inline-block rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-400/15"
            >
              Sign in to save this deck
            </Link>
          </div>

          <div className="mt-8 max-w-4xl">
            <div className="inline-flex rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-xs font-medium tracking-wide text-yellow-200">
              Preview Mode
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">
              {draft.deckName || 'Guest deck preview'}
            </h1>
            <p className="mt-3 text-zinc-400">
              This deck is not saved to an account yet. Sign in to carry the list into the real
              import flow and keep it.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-zinc-400">Detected Format</div>
            <div className="mt-2 text-2xl font-semibold text-white">
              {getDeckFormatLabel(detectedFormat)}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-zinc-400">Cards Parsed</div>
            <div className="mt-2 text-2xl font-semibold text-white">{totalCards}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-zinc-400">Validation</div>
            <div className="mt-2 text-2xl font-semibold text-white">
              {validation.isValid ? 'Looks good' : 'Needs review'}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-zinc-400">Commander Bracket</div>
            <div className="mt-2 text-2xl font-semibold text-white">{bracket.label}</div>
          </div>
        </div>

        {!validation.isValid && validation.errors.length > 0 && (
          <div className="mt-6 rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5">
            <div className="text-sm font-medium text-yellow-200">Validation notes</div>
            <ul className="mt-3 list-disc pl-5 text-sm text-yellow-100/90">
              {validation.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            {[
              { title: 'Commander', cards: commanders },
              { title: 'Mainboard', cards: mainboard },
              { title: 'Tokens', cards: tokens },
            ].map((group) => (
              <div key={group.title} className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-2xl font-semibold">{group.title}</h2>
                  <div className="text-sm text-zinc-400">
                    {group.cards.reduce((sum, card) => sum + card.quantity, 0)} cards
                  </div>
                </div>

                {group.cards.length === 0 ? (
                  <div className="mt-4 text-sm text-zinc-400">No cards in this section.</div>
                ) : (
                  <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
                    <div className="grid grid-cols-[80px_1fr_180px] gap-3 border-b border-white/10 bg-white/5 px-4 py-3 text-xs uppercase tracking-wide text-zinc-400">
                      <div>Qty</div>
                      <div>Card</div>
                      <div>Print</div>
                    </div>
                    {group.cards.map((card) => (
                      <div
                        key={card.id}
                        className="grid grid-cols-[80px_1fr_180px] gap-3 border-b border-white/10 px-4 py-3 text-sm last:border-b-0"
                      >
                        <div className="text-zinc-300">{card.quantity}</div>
                        <div className="font-medium text-white">{card.cardName}</div>
                        <div className="text-zinc-400">{formatPrint(card) || 'N/A'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-6">
              <div className="text-sm font-medium text-emerald-200">What this preview shows</div>
              <div className="mt-4 space-y-3 text-sm text-emerald-50/90">
                <p>Deck parsing and sectioning</p>
                <p>Format detection and validation</p>
                <p>Commander bracket estimation when possible</p>
                <p>How the deck would look before saving</p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <div className="text-sm font-medium text-white">Save this deck</div>
              <p className="mt-3 text-sm text-zinc-400">
                Sign in or create an account to carry this list into the authenticated import flow,
                enrich it, and save it to your collection.
              </p>
              <Link
                href="/sign-in"
                className="mt-5 inline-block rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90"
              >
                Sign in to save
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
