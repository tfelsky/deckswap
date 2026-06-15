'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

export type SelectableDeck = {
  id: number
  name: string
  commander: string | null
  power: number
}

type PodSelectorProps = {
  decks: SelectableDeck[]
  initialSelected: number[]
  initialOptions: { proxies: boolean; stax: boolean; combo: boolean }
}

export default function PodSelector({
  decks,
  initialSelected,
  initialOptions,
}: PodSelectorProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<number>>(new Set(initialSelected))
  const [options, setOptions] = useState(initialOptions)

  const count = selected.size
  const canGenerate = count >= 4

  const sorted = useMemo(
    () => [...decks].sort((a, b) => b.power - a.power || a.name.localeCompare(b.name)),
    [decks]
  )

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(decks.map((d) => d.id)))
  }

  function clear() {
    setSelected(new Set())
  }

  function generate() {
    if (!canGenerate) return
    const params = new URLSearchParams()
    params.set('decks', [...selected].sort((a, b) => a - b).join(','))
    if (!options.proxies) params.set('proxies', '0')
    if (!options.stax) params.set('stax', '0')
    if (!options.combo) params.set('combo', '0')
    router.push(`/podmatch/pods/generate?${params.toString()}`)
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Select decks ({count} chosen)</h2>
        <div className="flex gap-2 text-sm">
          <button onClick={selectAll} className="rounded-xl border border-white/10 px-3 py-1.5 hover:bg-white/5">
            Select all
          </button>
          <button onClick={clear} className="rounded-xl border border-white/10 px-3 py-1.5 hover:bg-white/5">
            Clear
          </button>
        </div>
      </div>

      {decks.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-400">
          You need scored decks to build pods. Analyze some decks in PodMatch first.
        </p>
      ) : (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {sorted.map((deck) => {
            const isOn = selected.has(deck.id)
            return (
              <li key={deck.id}>
                <label
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition ${
                    isOn ? 'border-primary/40 bg-primary/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isOn}
                      onChange={() => toggle(deck.id)}
                      className="h-4 w-4 accent-primary"
                    />
                    <span>
                      <span className="block text-sm font-medium">{deck.name}</span>
                      {deck.commander ? (
                        <span className="block text-xs text-zinc-400">{deck.commander}</span>
                      ) : null}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full border border-white/10 bg-zinc-950 px-2 py-0.5 text-xs font-semibold text-zinc-300">
                    {deck.power}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-white/10 pt-4 text-sm">
        <span className="text-zinc-400">Pod rules:</span>
        <Toggle
          label="Allow proxies"
          checked={options.proxies}
          onChange={(v) => setOptions((o) => ({ ...o, proxies: v }))}
        />
        <Toggle
          label="Allow stax"
          checked={options.stax}
          onChange={(v) => setOptions((o) => ({ ...o, stax: v }))}
        />
        <Toggle
          label="Allow combo"
          checked={options.combo}
          onChange={(v) => setOptions((o) => ({ ...o, combo: v }))}
        />
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={generate}
          disabled={!canGenerate}
          className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Generate pods
        </button>
        {!canGenerate ? (
          <span className="text-sm text-zinc-500">Select at least 4 decks.</span>
        ) : null}
      </div>
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-primary"
      />
      <span>{label}</span>
    </label>
  )
}
