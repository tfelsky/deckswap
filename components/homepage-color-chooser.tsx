"use client"

import { useState } from "react"
import Link from "next/link"

type ColorFilterItem = {
  code: string
  label: string
}

type ColorFilterGroup = {
  id: string
  title: string
  items: ColorFilterItem[]
}

type HomepageColorChooserProps = {
  groups: ColorFilterGroup[]
  fiveColorItem: ColorFilterItem
  selectedColor: string | null
  colorCounts: Record<string, number>
  manaSwatches: Record<string, string>
  colorFlavor: Record<string, string>
}

function getColorSwatches(code: string) {
  if (code === "C") return ["C"]
  return code.split("").filter(Boolean)
}

function getInitialGroup(groups: ColorFilterGroup[], selectedColor: string | null) {
  if (!selectedColor) return groups[0]?.id ?? null

  const match = groups.find((group) => group.items.some((item) => item.code === selectedColor))
  return match?.id ?? groups[0]?.id ?? null
}

export function HomepageColorChooser({
  groups,
  fiveColorItem,
  selectedColor,
  colorCounts,
  manaSwatches,
  colorFlavor,
}: HomepageColorChooserProps) {
  const [openGroup, setOpenGroup] = useState<string | null>(getInitialGroup(groups, selectedColor))

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {groups.map((group) => {
          const isOpen = openGroup === group.id
          const groupDeckCount = group.items.reduce(
            (sum, item) => sum + (colorCounts[item.code] ?? 0),
            0
          )

          return (
            <button
              key={group.id}
              type="button"
              onClick={() => setOpenGroup((current) => (current === group.id ? null : group.id))}
              className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] transition sm:min-h-10 ${
                isOpen
                  ? "border-primary/30 bg-primary/12 text-foreground shadow-[0_10px_24px_rgba(0,0,0,0.12)]"
                  : "border-border/80 bg-white/5 text-muted-foreground hover:border-primary/20 hover:text-foreground"
              }`}
            >
              <span>{group.title}</span>
              <span className="rounded-full border border-white/10 bg-black/15 px-1.5 py-0.5 text-[9px] text-foreground/70">
                {groupDeckCount}
              </span>
            </button>
          )
        })}

        <Link
          href={`/?color=${fiveColorItem.code}`}
          title={`${fiveColorItem.label} - ${colorCounts[fiveColorItem.code] ?? 0} decks`}
          className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] transition sm:min-h-10 ${
            selectedColor === fiveColorItem.code
              ? "border-primary/30 bg-[linear-gradient(135deg,rgba(71,202,157,0.22),rgba(234,190,94,0.12))] text-foreground shadow-[0_10px_24px_rgba(0,0,0,0.16)]"
              : "border-border/80 bg-white/5 text-muted-foreground hover:border-primary/20 hover:text-foreground"
          }`}
        >
          <span>{fiveColorItem.label}</span>
          <span className="rounded-full border border-white/10 bg-black/15 px-1.5 py-0.5 text-[9px] text-foreground/70">
            {colorCounts[fiveColorItem.code] ?? 0}
          </span>
        </Link>
      </div>

      {openGroup ? (
        <div className="rounded-2xl border border-border/70 bg-black/10 p-2.5 sm:p-3">
          <div className="flex flex-wrap gap-2">
            {groups
              .find((group) => group.id === openGroup)
              ?.items.map((item) => {
                const active = selectedColor === item.code
                const count = colorCounts[item.code] ?? 0

                return (
                  <Link
                    key={item.code}
                    href={`/?color=${item.code}`}
                    title={`${item.label} - ${count} decks`}
                    className={`group inline-flex min-h-9 items-center gap-2 rounded-full border px-2 py-1.5 transition ${
                      active
                        ? "border-primary/30 bg-[linear-gradient(135deg,rgba(71,202,157,0.22),rgba(234,190,94,0.12))] shadow-[0_10px_24px_rgba(0,0,0,0.16)]"
                        : "border-border/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))] hover:border-primary/20 hover:bg-[linear-gradient(135deg,rgba(71,202,157,0.12),rgba(234,190,94,0.06))]"
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {getColorSwatches(item.code).map((symbol) => (
                        <span
                          key={`${item.code}-${symbol}`}
                          className={`inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/15 text-[8px] font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] ${manaSwatches[symbol]}`}
                        >
                          {symbol}
                        </span>
                      ))}
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground/90">
                      {item.code}
                    </span>
                    <span className="rounded-full border border-white/10 bg-black/15 px-1.5 py-0.5 text-[9px] text-foreground/70">
                      {count}
                    </span>
                  </Link>
                )
              })}
          </div>
        </div>
      ) : null}

      {selectedColor && colorFlavor[selectedColor] ? (
        <p className="pt-1 text-xs text-muted-foreground">{colorFlavor[selectedColor]}</p>
      ) : null}
    </div>
  )
}
