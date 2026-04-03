'use client'

import { useEffect, useMemo, useState } from 'react'

type BaseCard = {
  id: number
  quantity: number
  card_name: string
  set_code?: string | null
  set_name?: string | null
  collector_number?: string | null
  foil?: boolean | null
  image_url?: string | null
  section: 'commander' | 'mainboard' | 'token'
}

type DeckCardViewsProps = {
  commanders: BaseCard[]
  mainboard: BaseCard[]
  tokens: BaseCard[]
}

function printLine(card: BaseCard) {
  const parts = []
  if (card.set_name) parts.push(card.set_name)
  else if (card.set_code) parts.push(card.set_code.toUpperCase())

  if (card.collector_number) parts.push(`#${card.collector_number}`)
  if (card.foil) parts.push('Foil')

  return parts.join(' • ')
}

function getScryfallUrl(card: BaseCard) {
  if (card.set_code && card.collector_number) {
    return `https://scryfall.com/search?q=set%3A${encodeURIComponent(
      card.set_code
    )}+cn%3A${encodeURIComponent(card.collector_number)}`
  }

  return `https://scryfall.com/search?q=%21%22${encodeURIComponent(
    card.card_name
  )}%22`
}

function MetaChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-white/10 bg-black/20 px-2 py-0.5 text-xs text-zinc-300">
      {children}
    </span>
  )
}

function CardModal({
  cards,
  selectedIndex,
  onClose,
  onPrev,
  onNext,
}: {
  cards: BaseCard[]
  selectedIndex: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}) {
  const card = cards[selectedIndex] ?? null

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!card) return

      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'ArrowRight') onNext()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [card, onClose, onPrev, onNext])

  if (!card) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-3xl border border-white/10 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h3 className="text-xl font-semibold text-white">{card.card_name}</h3>
            <p className="mt-1 text-sm text-zinc-400">
              {printLine(card) || 'No print metadata'}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onPrev}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
            >
              ← Prev
            </button>
            <button
              onClick={onNext}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
            >
              Next →
            </button>
            <a
              href={getScryfallUrl(card)}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-400/15"
            >
              Open in Scryfall
            </a>
            <button
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
            >
              Close
            </button>
          </div>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[340px_1fr]">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-800">
            <div className="aspect-[5/7]">
              {card.image_url ? (
                <img
                  src={card.image_url}
                  alt={card.card_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-end p-5">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-emerald-300">
                      Card Preview
                    </div>
                    <div className="mt-2 text-xl font-semibold text-white">
                      {card.card_name}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm text-zinc-400">Card Name</div>
              <div className="mt-2 text-xl font-semibold text-white">
                {card.card_name}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {card.set_code && <MetaChip>{card.set_code.toUpperCase()}</MetaChip>}
                {card.collector_number && <MetaChip>#{card.collector_number}</MetaChip>}
                <MetaChip>{card.foil ? 'Foil' : 'Non-foil'}</MetaChip>
                <MetaChip>Qty {card.quantity}</MetaChip>
                <MetaChip>{card.section}</MetaChip>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm text-zinc-400">Set Name</div>
                <div className="mt-2 text-lg font-medium text-white">
                  {card.set_name || 'Unknown'}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm text-zinc-400">Set Code</div>
                <div className="mt-2 text-lg font-medium text-white">
                  {card.set_code?.toUpperCase() || '—'}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm text-zinc-400">Collector Number</div>
                <div className="mt-2 text-lg font-medium text-white">
                  {card.collector_number || '—'}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm text-zinc-400">Finish</div>
                <div className="mt-2 text-lg font-medium text-white">
                  {card.foil ? 'Foil' : 'Non-foil'}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm text-zinc-400">Quantity</div>
                <div className="mt-2 text-lg font-medium text-white">
                  {card.quantity}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm text-zinc-400">Section</div>
                <div className="mt-2 text-lg font-medium capitalize text-white">
                  {card.section}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5">
              <div className="text-sm text-emerald-200">Navigation</div>
              <p className="mt-2 text-sm text-emerald-100/90">
                Press <strong>Escape</strong> to close, <strong>Left Arrow</strong> for previous, and <strong>Right Arrow</strong> for next.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CardTile({
  card,
  onOpen,
  label,
}: {
  card: BaseCard
  onOpen: () => void
  label?: string
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 text-left transition hover:border-emerald-400/30"
    >
      <div className="aspect-[5/7] bg-zinc-800">
        {card.image_url ? (
          <img
            src={card.image_url}
            alt={card.card_name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-end p-4">
            <div>
              {label && (
                <div className="text-xs uppercase tracking-wide text-emerald-300">
                  {label}
                </div>
              )}
              <div className="mt-2 text-lg font-semibold text-white">
                {card.card_name}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="font-medium text-white">{card.card_name}</div>
        <div className="mt-1 text-xs text-zinc-400">
          {printLine(card) || 'No print metadata'}
        </div>
        <div className="mt-2 text-sm text-zinc-300">Qty: {card.quantity}</div>
      </div>
    </button>
  )
}

export default function DeckCardViews({
  commanders,
  mainboard,
  tokens,
}: DeckCardViewsProps) {
  const [view, setView] = useState<'table' | 'grid'>('table')
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null)

  const modalCards = useMemo(
    () => [...commanders, ...mainboard, ...tokens],
    [commanders, mainboard, tokens]
  )

  const selectedIndex = modalCards.findIndex((card) => card.id === selectedCardId)

  function openCard(card: BaseCard) {
    setSelectedCardId(card.id)
  }

  function closeModal() {
    setSelectedCardId(null)
  }

  function goPrev() {
    if (selectedIndex === -1 || modalCards.length === 0) return
    const prevIndex = (selectedIndex - 1 + modalCards.length) % modalCards.length
    setSelectedCardId(modalCards[prevIndex].id)
  }

  function goNext() {
    if (selectedIndex === -1 || modalCards.length === 0) return
    const nextIndex = (selectedIndex + 1) % modalCards.length
    setSelectedCardId(modalCards[nextIndex].id)
  }

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <h2 className="text-2xl font-semibold">Commander</h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {commanders.length === 0 ? (
            <div className="text-sm text-zinc-400">No commander cards saved.</div>
          ) : (
            commanders.map((card) => (
              <CardTile
                key={card.id}
                card={card}
                onOpen={() => openCard(card)}
                label="Commander"
              />
            ))
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Mainboard</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Switch between dense table view and visual printings review.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setView('table')}
              className={`rounded-xl px-4 py-2 text-sm ${
                view === 'table'
                  ? 'bg-emerald-400 text-zinc-950'
                  : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
              }`}
            >
              Table
            </button>
            <button
              onClick={() => setView('grid')}
              className={`rounded-xl px-4 py-2 text-sm ${
                view === 'grid'
                  ? 'bg-emerald-400 text-zinc-950'
                  : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
              }`}
            >
              Thumbnails
            </button>
          </div>
        </div>

        {mainboard.length === 0 ? (
          <div className="mt-5 text-sm text-zinc-400">No mainboard cards saved.</div>
        ) : view === 'table' ? (
          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
            <div className="grid grid-cols-[70px_1fr_320px_120px] gap-3 border-b border-white/10 bg-white/5 px-4 py-3 text-xs uppercase tracking-wide text-zinc-400">
              <div>Qty</div>
              <div>Card</div>
              <div>Printing</div>
              <div>Preview</div>
            </div>

            {mainboard.map((card) => (
              <div
                key={card.id}
                className="grid grid-cols-[70px_1fr_320px_120px] gap-3 border-b border-white/10 px-4 py-3 text-sm last:border-b-0"
              >
                <div className="text-zinc-300">{card.quantity}</div>
                <div className="font-medium text-white">{card.card_name}</div>
                <div className="text-zinc-400">{printLine(card) || '—'}</div>
                <div>
                  <button
                    type="button"
                    onClick={() => openCard(card)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white hover:bg-white/10"
                  >
                    Open
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {mainboard.map((card) => (
              <CardTile
                key={card.id}
                card={card}
                onOpen={() => openCard(card)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <h2 className="text-2xl font-semibold">Tokens</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Optional token package associated with this deck.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {tokens.length === 0 ? (
            <div className="text-sm text-zinc-400">No tokens saved.</div>
          ) : (
            tokens.map((card) => (
              <CardTile
                key={card.id}
                card={card}
                onOpen={() => openCard(card)}
                label="Token"
              />
            ))
          )}
        </div>
      </div>

      {selectedIndex >= 0 && (
        <CardModal
          cards={modalCards}
          selectedIndex={selectedIndex}
          onClose={closeModal}
          onPrev={goPrev}
          onNext={goNext}
        />
      )}
    </div>
  )
}