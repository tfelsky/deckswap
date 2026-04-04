'use client'

import { useEffect, useMemo, useState } from 'react'
import { CARD_CONDITION_DETAILS, getCardConditionMeta } from '@/lib/decks/conditions'

type BaseCard = {
  id: number
  quantity: number
  card_name: string
  set_code?: string | null
  set_name?: string | null
  collector_number?: string | null
  foil?: boolean | null
  image_url?: string | null
  price_usd?: number | null
  price_usd_foil?: number | null
  type_line?: string | null
  color_identity?: string[] | null
  mana_cost?: string | null
  cmc?: number | null
  power?: string | null
  toughness?: string | null
  oracle_text?: string | null
  keywords?: string[] | null
  condition?: string | null
  section: 'commander' | 'mainboard' | 'sideboard' | 'token'
}

type DeckCardViewsProps = {
  commanders: BaseCard[]
  mainboard: BaseCard[]
  sideboard: BaseCard[]
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

function getUnitPrice(card: BaseCard) {
  return card.foil
    ? (card.price_usd_foil ?? card.price_usd ?? null)
    : (card.price_usd ?? null)
}

function getLineTotal(card: BaseCard) {
  const unitPrice = getUnitPrice(card)
  return unitPrice != null ? unitPrice * card.quantity : null
}

function formatUsd(value?: number | null) {
  if (value == null) return 'N/A'
  return `$${value.toFixed(2)}`
}

function formatColorIdentity(colors?: string[] | null) {
  if (!colors || colors.length === 0) return 'Colorless'
  return colors.join(', ')
}

function summarizeCommanderPlan(card: BaseCard) {
  const oracle = (card.oracle_text ?? '').replace(/\s+/g, ' ').trim()
  const lower = oracle.toLowerCase()
  const notes: string[] = []

  if (lower.includes('treasure')) notes.push('Makes or rewards Treasure, so ramp and artifact payoffs matter.')
  if (lower.includes('draw') || lower.includes('card')) notes.push('Generates card flow, so cheap support pieces help keep the engine moving.')
  if (lower.includes('token') || lower.includes('create')) notes.push('Wants token support and ways to convert extra bodies into pressure or value.')
  if (lower.includes('cast') || lower.includes('spells')) notes.push('Leans toward chaining spells, so low-curve interaction and velocity pieces fit well.')
  if (lower.includes('attack') || lower.includes('combat')) notes.push('Pushes toward combat, so haste, protection, and clean attack steps matter.')
  if (lower.includes('+1/+1')) notes.push('Cares about counters, so scaling threats and counter payoffs are a natural fit.')
  if (lower.includes('graveyard') || lower.includes('dies') || lower.includes('sacrifice')) {
    notes.push('Uses the graveyard well, so recursion and sacrifice loops are worth looking at.')
  }
  if (lower.includes('equipment') || lower.includes('aura')) {
    notes.push('Likes to suit creatures up, so efficient equipment or aura support helps it snowball.')
  }

  if (notes.length === 0) {
    if (card.type_line?.includes('Creature')) {
      notes.push('Looks like a board-centric commander that wants a clean curve, reliable ramp, and protection for its key turns.')
    } else {
      notes.push('Looks like a synergy commander that wants focused support pieces and a clean plan instead of generic good-stuff slots.')
    }
  }

  return notes.slice(0, 3)
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
              {'<-'} Prev
            </button>
            <button
              onClick={onNext}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
            >
              Next {'->'}
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
                  className="block h-full w-full object-cover object-top"
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

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-sm text-zinc-400">Unit Price</div>
                  <div className="mt-1 text-lg font-medium text-emerald-300">
                    {formatUsd(getUnitPrice(card))}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-zinc-400">Line Total</div>
                  <div className="mt-1 text-lg font-medium text-emerald-300">
                    {formatUsd(getLineTotal(card))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {card.set_code && <MetaChip>{card.set_code.toUpperCase()}</MetaChip>}
                {card.collector_number && <MetaChip>#{card.collector_number}</MetaChip>}
                <MetaChip>{card.foil ? 'Foil' : 'Non-foil'}</MetaChip>
                <MetaChip>Qty {card.quantity}</MetaChip>
                <MetaChip>{card.section}</MetaChip>
                <MetaChip>{getCardConditionMeta(card.condition).shortLabel}</MetaChip>
                {card.cmc != null && <MetaChip>CMC {card.cmc}</MetaChip>}
                {card.power && card.toughness && (
                  <MetaChip>
                    {card.power}/{card.toughness}
                  </MetaChip>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:col-span-2">
                <div className="text-sm text-zinc-400">Type</div>
                <div className="mt-2 text-lg font-medium text-white">
                  {card.type_line || 'Unknown'}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm text-zinc-400">Set Name</div>
                <div className="mt-2 text-lg font-medium text-white">
                  {card.set_name || 'Unknown'}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm text-zinc-400">Set Code</div>
                <div className="mt-2 text-lg font-medium text-white">
                  {card.set_code?.toUpperCase() || 'N/A'}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm text-zinc-400">Collector Number</div>
                <div className="mt-2 text-lg font-medium text-white">
                  {card.collector_number || 'N/A'}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm text-zinc-400">Finish</div>
                <div className="mt-2 text-lg font-medium text-white">
                  {card.foil ? 'Foil' : 'Non-foil'}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm text-zinc-400">Condition</div>
                <div className="mt-2 text-lg font-medium text-white">
                  {getCardConditionMeta(card.condition).label}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm text-zinc-400">Color</div>
                <div className="mt-2 text-lg font-medium text-white">
                  {formatColorIdentity(card.color_identity)}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm text-zinc-400">Mana Cost</div>
                <div className="mt-2 text-lg font-medium text-white">
                  {card.mana_cost || 'N/A'}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm text-zinc-400">CMC</div>
                <div className="mt-2 text-lg font-medium text-white">
                  {card.cmc ?? 'N/A'}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm text-zinc-400">Power / Toughness</div>
                <div className="mt-2 text-lg font-medium text-white">
                  {card.power && card.toughness
                    ? `${card.power}/${card.toughness}`
                    : 'N/A'}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm text-zinc-400">Quantity</div>
                <div className="mt-2 text-lg font-medium text-white">
                  {card.quantity}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm text-zinc-400">Unit Price</div>
                <div className="mt-2 text-lg font-medium text-emerald-300">
                  {formatUsd(getUnitPrice(card))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:col-span-2">
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

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm text-zinc-400">Condition Guide</div>
              <p className="mt-2 text-sm text-zinc-300">
                {getCardConditionMeta(card.condition).description}
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
            className="block h-full w-full object-cover object-top"
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
        <div className="mt-2 flex items-center justify-between gap-3 text-sm">
          <span className="text-zinc-300">
            Qty: {card.quantity} · {getCardConditionMeta(card.condition).shortLabel}
          </span>
          <span className="font-medium text-emerald-300">
            {formatUsd(getUnitPrice(card))}
          </span>
        </div>
      </div>
    </button>
  )
}

export default function DeckCardViews({
  commanders,
  mainboard,
  sideboard,
  tokens,
}: DeckCardViewsProps) {
  const [view, setView] = useState<'table' | 'grid'>('table')
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null)

  const modalCards = useMemo(
    () => [...commanders, ...mainboard, ...sideboard, ...tokens],
    [commanders, mainboard, sideboard, tokens]
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

        <div className="mt-5 space-y-4">
          {commanders.length === 0 ? (
            <div className="text-sm text-zinc-400">No commander cards saved.</div>
          ) : (
            commanders.map((card) => (
              <div
                key={card.id}
                className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 md:grid-cols-[12rem_1fr]"
              >
                <div className="w-full max-w-[12rem]">
                  <CardTile
                    card={card}
                    onOpen={() => openCard(card)}
                    label="Commander"
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-emerald-300">
                      Commander Snapshot
                    </div>
                    <h3 className="mt-2 text-xl font-semibold text-white">{card.card_name}</h3>
                    <p className="mt-2 text-sm text-zinc-400">
                      {card.type_line || 'Commander details will appear here after enrichment.'}
                    </p>
                  </div>

                <div className="flex flex-wrap gap-2">
                  {card.mana_cost && <MetaChip>{card.mana_cost}</MetaChip>}
                  <MetaChip>{formatColorIdentity(card.color_identity)}</MetaChip>
                  <MetaChip>{getCardConditionMeta(card.condition).label}</MetaChip>
                  {card.cmc != null && <MetaChip>CMC {card.cmc}</MetaChip>}
                    {card.power && card.toughness && (
                      <MetaChip>
                        {card.power}/{card.toughness}
                      </MetaChip>
                    )}
                    {card.keywords?.slice(0, 3).map((keyword) => (
                      <MetaChip key={keyword}>{keyword}</MetaChip>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-sm font-medium text-white">What this commander wants to do</div>
                    <div className="mt-3 space-y-2 text-sm text-zinc-300">
                      {summarizeCommanderPlan(card).map((note) => (
                        <p key={note}>{note}</p>
                      ))}
                    </div>
                  </div>

                  {card.oracle_text && (
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-sm font-medium text-white">Card Text</div>
                      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-zinc-300">
                        {card.oracle_text}
                      </p>
                    </div>
                  )}
                </div>
              </div>
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
            <div className="grid grid-cols-[70px_1fr_260px_110px_120px] gap-3 border-b border-white/10 bg-white/5 px-4 py-3 text-xs uppercase tracking-wide text-zinc-400">
              <div>Qty</div>
              <div>Card</div>
              <div>Printing</div>
              <div>Price</div>
              <div>Preview</div>
            </div>

            {mainboard.map((card) => (
              <div
                key={card.id}
                className="grid grid-cols-[70px_1fr_260px_110px_120px] gap-3 border-b border-white/10 px-4 py-3 text-sm transition hover:bg-white/[0.03] last:border-b-0"
              >
                <div className="text-zinc-300">{card.quantity}</div>
                <div className="font-medium text-white">{card.card_name}</div>
                <div className="text-zinc-400">{printLine(card) || 'N/A'}</div>
                <div className="font-medium text-emerald-300">
                  {formatUsd(getUnitPrice(card))}
                </div>
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
        <h2 className="text-2xl font-semibold">Sideboard</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Optional 60-card format sideboard stored with the deck import.
        </p>

        {sideboard.length === 0 ? (
          <div className="mt-5 text-sm text-zinc-400">No sideboard cards saved.</div>
        ) : view === 'table' ? (
          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
            <div className="grid grid-cols-[70px_1fr_260px_110px_120px] gap-3 border-b border-white/10 bg-white/5 px-4 py-3 text-xs uppercase tracking-wide text-zinc-400">
              <div>Qty</div>
              <div>Card</div>
              <div>Printing</div>
              <div>Price</div>
              <div>Preview</div>
            </div>

            {sideboard.map((card) => (
              <div
                key={card.id}
                className="grid grid-cols-[70px_1fr_260px_110px_120px] gap-3 border-b border-white/10 px-4 py-3 text-sm transition hover:bg-white/[0.03] last:border-b-0"
              >
                <div className="text-zinc-300">{card.quantity}</div>
                <div className="font-medium text-white">{card.card_name}</div>
                <div className="text-zinc-400">{printLine(card) || 'N/A'}</div>
                <div className="font-medium text-emerald-300">
                  {formatUsd(getUnitPrice(card))}
                </div>
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
            {sideboard.map((card) => (
              <CardTile
                key={card.id}
                card={card}
                onOpen={() => openCard(card)}
                label="Sideboard"
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

      <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <h2 className="text-2xl font-semibold">Card Condition Reference</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Object.entries(CARD_CONDITION_DETAILS).map(([key, detail]) => (
            <div
              key={key}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div className="text-xs uppercase tracking-wide text-emerald-300">
                {detail.shortLabel}
              </div>
              <div className="mt-2 text-lg font-semibold text-white">{detail.label}</div>
              <p className="mt-2 text-sm text-zinc-400">{detail.description}</p>
            </div>
          ))}
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
