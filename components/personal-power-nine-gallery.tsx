'use client'

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'

type GalleryCard = {
  id: number
  slot_number: number
  submitted_name: string
  requested_finish: string
  card_name?: string | null
  set_name?: string | null
  set_code?: string | null
  collector_number?: string | null
  image_url?: string | null
  rarity?: string | null
  type_line?: string | null
  artist_name?: string | null
  artist_summary?: string | null
  artist_notable_cards?: string[] | null
  top_eight_points?: string[] | null
  color_identity?: string[] | null
  exact_print_matched?: boolean | null
}

type SortMode = 'slot' | 'type' | 'color' | 'rarity'

const SORT_OPTIONS: Array<{ value: SortMode; label: string; description: string }> = [
  { value: 'slot', label: 'Original', description: 'Keep your submitted order.' },
  { value: 'type', label: 'By type', description: 'Cluster creatures, artifacts, spells, and lands.' },
  { value: 'color', label: 'By color', description: 'Sweep from colorless through five-color cards.' },
  { value: 'rarity', label: 'By rarity', description: 'Spotlight mythics and rares first.' },
]

function normalizeText(value?: string | null) {
  return value?.trim() ?? ''
}

function classifyType(typeLine?: string | null) {
  const normalized = normalizeText(typeLine).toLowerCase()
  if (!normalized) return 'other'
  if (normalized.includes('creature')) return 'creature'
  if (normalized.includes('artifact')) return 'artifact'
  if (normalized.includes('enchantment')) return 'enchantment'
  if (normalized.includes('planeswalker')) return 'planeswalker'
  if (normalized.includes('instant')) return 'instant'
  if (normalized.includes('sorcery')) return 'sorcery'
  if (normalized.includes('land')) return 'land'
  return 'other'
}

function typeRank(typeLine?: string | null) {
  switch (classifyType(typeLine)) {
    case 'creature':
      return 1
    case 'planeswalker':
      return 2
    case 'artifact':
      return 3
    case 'enchantment':
      return 4
    case 'instant':
      return 5
    case 'sorcery':
      return 6
    case 'land':
      return 7
    default:
      return 8
  }
}

function colorRank(colors?: string[] | null) {
  const normalized = Array.isArray(colors) ? colors.join('') : ''
  if (!normalized) return '0'
  return normalized
}

function rarityRank(rarity?: string | null) {
  switch (normalizeText(rarity).toLowerCase()) {
    case 'mythic':
      return 1
    case 'rare':
      return 2
    case 'special':
      return 3
    case 'uncommon':
      return 4
    case 'common':
      return 5
    default:
      return 6
  }
}

function compareCards(mode: SortMode, a: GalleryCard, b: GalleryCard) {
  if (mode === 'type') {
    return (
      typeRank(a.type_line) - typeRank(b.type_line) ||
      rarityRank(a.rarity) - rarityRank(b.rarity) ||
      a.slot_number - b.slot_number
    )
  }

  if (mode === 'color') {
    return (
      colorRank(a.color_identity).localeCompare(colorRank(b.color_identity)) ||
      typeRank(a.type_line) - typeRank(b.type_line) ||
      a.slot_number - b.slot_number
    )
  }

  if (mode === 'rarity') {
    return (
      rarityRank(a.rarity) - rarityRank(b.rarity) ||
      colorRank(a.color_identity).localeCompare(colorRank(b.color_identity)) ||
      a.slot_number - b.slot_number
    )
  }

  return a.slot_number - b.slot_number
}

function layoutClassName(mode: SortMode, index: number) {
  if (mode === 'rarity') {
    if (index === 0) return 'md:col-span-2 md:row-span-2'
    if (index < 3) return 'md:col-span-2'
  }

  if (mode === 'color') {
    if (index % 4 === 0) return 'md:col-span-2'
  }

  if (mode === 'type') {
    if (index === 1 || index === 5) return 'md:row-span-2'
  }

  if (mode === 'slot') {
    if (index === 4) return 'md:col-span-2'
  }

  return ''
}

export function PersonalPowerNineGallery({
  cards,
}: {
  cards: GalleryCard[]
}) {
  const [sortMode, setSortMode] = useState<SortMode>('slot')
  const cardRefs = useRef(new Map<number, HTMLElement>())
  const previousRects = useRef(new Map<number, DOMRect>())

  const sortedCards = useMemo(() => {
    return [...cards].sort((a, b) => compareCards(sortMode, a, b))
  }, [cards, sortMode])

  useLayoutEffect(() => {
    const nextRects = new Map<number, DOMRect>()

    for (const card of sortedCards) {
      const node = cardRefs.current.get(card.id)
      if (!node) continue

      const previous = previousRects.current.get(card.id)
      const next = node.getBoundingClientRect()
      nextRects.set(card.id, next)

      if (!previous) continue

      const deltaX = previous.left - next.left
      const deltaY = previous.top - next.top

      if (deltaX === 0 && deltaY === 0) continue

      node.animate(
        [
          { transform: `translate(${deltaX}px, ${deltaY}px) scale(0.98)` },
          { transform: 'translate(0px, 0px) scale(1)' },
        ],
        {
          duration: 420,
          easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        }
      )
    }

    previousRects.current = nextRects
  }, [sortedCards])

  if (cards.length === 0) {
    return null
  }

  return (
    <section className="mt-10 rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6 text-white">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-sm font-medium uppercase tracking-[0.2em] text-amber-200">
            Submission Board
          </div>
          <h3 className="mt-3 text-3xl font-semibold tracking-tight">Animated Personal Power 9 layout</h3>
          <p className="mt-2 max-w-3xl text-sm text-zinc-300">
            Reorder the nine-card board by type, color, or rarity. The grid shifts layout with each
            view so the standout cards surface differently.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSortMode(option.value)}
              className={`rounded-2xl border px-4 py-2 text-sm transition ${
                sortMode === option.value
                  ? 'border-amber-300/40 bg-amber-300 text-zinc-950'
                  : 'border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10'
              }`}
              title={option.description}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-6 auto-rows-[minmax(280px,auto)]">
        {sortedCards.map((card, index) => (
          <article
            key={card.id}
            ref={(node) => {
              if (node) cardRefs.current.set(card.id, node)
              else cardRefs.current.delete(card.id)
            }}
            className={`group overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(39,39,42,0.92),rgba(9,9,11,0.96))] shadow-[0_20px_70px_rgba(0,0,0,0.28)] transition duration-300 hover:-translate-y-1 hover:border-amber-300/30 ${layoutClassName(sortMode, index)} md:col-span-2`}
          >
            <div className="grid h-full grid-cols-1">
              <div className="relative overflow-hidden border-b border-white/10 bg-zinc-900">
                {card.image_url ? (
                  <img
                    src={card.image_url}
                    alt={card.card_name || card.submitted_name}
                    className="h-64 w-full object-cover object-top transition duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-64 items-center justify-center bg-zinc-900 text-sm text-zinc-500">
                    Image unavailable
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent px-4 pb-4 pt-14">
                  <div className="flex items-center justify-between gap-3">
                    <Badge className="border-white/10 bg-black/40 text-white">Slot {card.slot_number}</Badge>
                    <Badge className="border-amber-300/20 bg-amber-300/15 text-amber-100">
                      {card.requested_finish === 'nonfoil' ? 'Non-foil' : card.requested_finish}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex h-full flex-col p-4">
                <div className="flex flex-wrap gap-2">
                  <Badge className="border-white/10 bg-white/5 text-zinc-100">
                    {card.rarity || 'Unknown rarity'}
                  </Badge>
                  <Badge className="border-white/10 bg-white/5 text-zinc-100">
                    {card.set_code?.toUpperCase() || 'Set ?'} {card.collector_number || ''}
                  </Badge>
                  <Badge
                    className={`${
                      card.exact_print_matched
                        ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
                        : 'border-amber-300/20 bg-amber-300/10 text-amber-100'
                    }`}
                  >
                    {card.exact_print_matched ? 'Exact print match' : 'Fallback card match'}
                  </Badge>
                </div>

                <div className="mt-4">
                  <h4 className="text-xl font-semibold text-white">
                    {card.card_name || card.submitted_name}
                  </h4>
                  <div className="mt-1 text-sm text-zinc-400">
                    {card.set_name || 'Unknown set'} • {card.type_line || 'Type unavailable'}
                  </div>
                  <div className="mt-2 text-sm text-zinc-300">
                    Artist: {card.artist_name || 'Unknown'}
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-zinc-300">
                  {card.artist_summary || 'Artist context will appear here once enrichment is available.'}
                </p>

                {card.artist_notable_cards && card.artist_notable_cards.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {card.artist_notable_cards.slice(0, 4).map((name) => (
                      <span
                        key={`${card.id}-${name}`}
                        className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-xs text-sky-100"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                ) : null}

                <details className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <summary className="cursor-pointer list-none text-sm font-medium text-amber-100">
                    Nizzahon-style top 8 talking points
                  </summary>
                  <ol className="mt-3 grid gap-2 text-sm text-zinc-200">
                    {(card.top_eight_points ?? []).slice(0, 8).map((point, pointIndex) => (
                      <li key={`${card.id}-point-${pointIndex}`} className="rounded-xl bg-black/20 px-3 py-2">
                        <span className="mr-2 text-amber-200">{pointIndex + 1}.</span>
                        {point}
                      </li>
                    ))}
                  </ol>
                </details>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
