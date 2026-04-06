import Link from 'next/link'
import { createAdminClientOrNull } from '@/lib/supabase/admin'
import { getAdminLogisticsSnapshot } from '@/lib/admin/logistics'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function formatUsd(value: number) {
  return `$${value.toFixed(2)}`
}

function formatTimestamp(value?: string | null) {
  if (!value) return 'Waiting for first scan'

  return new Date(value).toLocaleString('en-CA', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function laneCount(items: ReturnType<typeof useMapLanes>[number]['count']) {
  return new Intl.NumberFormat('en-CA').format(items)
}

function useMapLanes(snapshot: Awaited<ReturnType<typeof getAdminLogisticsSnapshot>>) {
  return [
    {
      id: 'ca-inbound',
      count: snapshot.inTransit.filter((item) => item.toWarehouseSlug === 'sarnia').length,
      className: 'left-[26%] top-[43%]',
    },
    {
      id: 'us-inbound',
      count: snapshot.inTransit.filter((item) => item.toWarehouseSlug === 'port-huron').length,
      className: 'right-[25%] top-[45%]',
    },
    {
      id: 'cross-border',
      count: snapshot.crossDockCount,
      className: 'left-1/2 top-[24%] -translate-x-1/2',
    },
  ]
}

export default async function AdminLogisticsPage() {
  const supabase = await createClient()
  const adminSupabase = createAdminClientOrNull() ?? supabase
  const snapshot = await getAdminLogisticsSnapshot(adminSupabase)
  const mapLanes = useMapLanes(snapshot)
  const sarnia = snapshot.warehouses.find((warehouse) => warehouse.slug === 'sarnia')
  const portHuron = snapshot.warehouses.find((warehouse) => warehouse.slug === 'port-huron')
  const canadaUsers = snapshot.usersByCountry.find((item) => item.countryCode === 'ca')
  const usaUsers = snapshot.usersByCountry.find((item) => item.countryCode === 'us')

  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="grid gap-4 md:grid-cols-4">
        {snapshot.metrics.map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-zinc-400">{metric.label}</div>
            <div className={`mt-2 text-3xl font-semibold ${metric.accent}`}>{metric.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-white/10 bg-zinc-900 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Logistics Map</h2>
              <p className="mt-2 max-w-3xl text-sm text-zinc-400">
                Admin view across the Canadian and U.S. hubs, active transit lanes, and deck inventory still sitting with users in-country.
              </p>
            </div>
            <div className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs text-sky-100">
              Transit feed references carrier tracking when present, otherwise a shipping-partner reference is generated automatically.
            </div>
          </div>

          <div className="relative mt-6 min-h-[560px] overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(52,211,153,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(56,189,248,0.18),_transparent_26%),linear-gradient(180deg,_rgba(10,14,20,0.96),_rgba(6,10,16,1))]">
            <div className="absolute inset-x-0 top-[17%] h-px bg-white/10" />
            <div className="absolute left-[10%] top-[12%] h-32 w-32 rounded-full bg-emerald-400/10 blur-3xl" />
            <div className="absolute right-[12%] top-[20%] h-36 w-36 rounded-full bg-sky-400/10 blur-3xl" />
            <div className="absolute left-[24%] top-[26%] h-[44%] w-[24%] rounded-[40%] border border-emerald-300/10 bg-emerald-400/5" />
            <div className="absolute right-[22%] top-[23%] h-[46%] w-[24%] rounded-[42%] border border-sky-300/10 bg-sky-400/5" />
            <div className="absolute left-[45%] top-[32%] h-[15%] w-[10%] rounded-full border border-cyan-200/20 bg-cyan-300/10" />

            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 560" fill="none" aria-hidden="true">
              <path d="M235 360C320 310 355 280 410 250" stroke="rgba(110,231,183,0.5)" strokeWidth="3" strokeDasharray="9 10" />
              <path d="M770 365C695 318 650 290 590 254" stroke="rgba(125,211,252,0.5)" strokeWidth="3" strokeDasharray="9 10" />
              <path d="M455 205C498 190 543 190 585 206" stroke="rgba(217,70,239,0.35)" strokeWidth="3" strokeDasharray="12 12" />
            </svg>

            <div className="absolute left-[12%] top-[66%] w-52 rounded-3xl border border-emerald-400/20 bg-black/45 p-4 backdrop-blur">
              <div className="text-xs uppercase tracking-[0.18em] text-emerald-200/80">Users In Country</div>
              <div className="mt-2 text-2xl font-semibold text-white">Canada</div>
              <div className="mt-3 text-3xl font-semibold text-emerald-300">{canadaUsers?.count ?? 0}</div>
              <div className="mt-1 text-sm text-zinc-400">Decks currently sitting with Canadian users</div>
              <div className="mt-3 text-xs text-zinc-500">Tracked value {formatUsd(canadaUsers?.totalValueUsd ?? 0)}</div>
            </div>

            <div className="absolute right-[10%] top-[66%] w-52 rounded-3xl border border-sky-400/20 bg-black/45 p-4 backdrop-blur">
              <div className="text-xs uppercase tracking-[0.18em] text-sky-100/80">Users In Country</div>
              <div className="mt-2 text-2xl font-semibold text-white">USA</div>
              <div className="mt-3 text-3xl font-semibold text-sky-300">{usaUsers?.count ?? 0}</div>
              <div className="mt-1 text-sm text-zinc-400">Decks currently sitting with U.S. users</div>
              <div className="mt-3 text-xs text-zinc-500">Tracked value {formatUsd(usaUsers?.totalValueUsd ?? 0)}</div>
            </div>

            <div className="absolute left-[38%] top-[31%] w-60 rounded-3xl border border-emerald-400/20 bg-zinc-950/80 p-4 shadow-[0_16px_50px_rgba(16,185,129,0.15)] backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-emerald-200/80">Warehouse</div>
                  <div className="mt-2 text-2xl font-semibold text-white">Sarnia, Canada</div>
                </div>
                <div className="h-4 w-4 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.9)]" />
              </div>
              <div className="mt-4 text-4xl font-semibold text-emerald-300">{sarnia?.count ?? 0}</div>
              <div className="mt-1 text-sm text-zinc-400">Decks on site</div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300">
                Intake focus: Canadian inbound escrow and received inventory
              </div>
            </div>

            <div className="absolute right-[35%] top-[33%] w-60 rounded-3xl border border-sky-400/20 bg-zinc-950/80 p-4 shadow-[0_16px_50px_rgba(56,189,248,0.15)] backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-sky-100/80">Warehouse</div>
                  <div className="mt-2 text-2xl font-semibold text-white">Port Huron, USA</div>
                </div>
                <div className="h-4 w-4 rounded-full bg-sky-300 shadow-[0_0_18px_rgba(125,211,252,0.9)]" />
              </div>
              <div className="mt-4 text-4xl font-semibold text-sky-300">{portHuron?.count ?? 0}</div>
              <div className="mt-1 text-sm text-zinc-400">Decks on site</div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300">
                Intake focus: U.S. inbound escrow and received inventory
              </div>
            </div>

            {mapLanes.map((lane) => (
              <div
                key={lane.id}
                className={`absolute ${lane.className} rounded-full border border-white/10 bg-black/60 px-4 py-2 text-xs font-medium text-white backdrop-blur`}
              >
                {laneCount(lane.count)} active
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-2xl font-semibold">Warehouse Split</h2>
            <div className="mt-5 space-y-3">
              {snapshot.warehouses.map((warehouse) => (
                <div
                  key={warehouse.slug}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-white">
                        {warehouse.city}, {warehouse.countryLabel}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">Received and staged inventory</div>
                    </div>
                    <div className="text-2xl font-semibold text-emerald-300">{warehouse.count}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-2xl font-semibold">Country Holdings</h2>
            <div className="mt-5 space-y-3">
              {snapshot.usersByCountry.map((country) => (
                <div
                  key={country.countryCode}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-white">{country.countryLabel}</div>
                      <div className="mt-1 text-xs text-zinc-500">
                        Value in users' hands {formatUsd(country.totalValueUsd)}
                      </div>
                    </div>
                    <div className="text-2xl font-semibold text-amber-200">{country.count}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {snapshot.unknownCountryCount > 0 ? (
            <div className="rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5 text-sm text-yellow-100">
              {snapshot.unknownCountryCount} decks or shipment legs are missing a usable country, so they are excluded from the map placement until profile geography is completed.
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Warehouse Intake Queue</h2>
            <p className="mt-2 max-w-3xl text-sm text-zinc-400">
              Employees can open the receive-and-inspect workflow from here once a shipment has landed at Sarnia or Port Huron.
            </p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-zinc-300">
            {snapshot.intakeQueue.length} decks awaiting or carrying intake review
          </div>
        </div>

        {snapshot.intakeQueue.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-zinc-400">
            No decks are currently waiting in the warehouse intake queue.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {snapshot.intakeQueue.map((item) => (
              <div key={`${item.tradeId}-${item.side}`} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold text-white">{item.deckLabel}</div>
                    <div className="mt-1 text-sm text-zinc-400">
                      Trade #{item.tradeId} side {item.side.toUpperCase()} at {item.warehouseLabel}
                    </div>
                    <div className="mt-2 text-xs text-zinc-500">Received {formatTimestamp(item.receivedAt)}</div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-zinc-200">
                    {item.inspectionStatus ?? 'pending'}
                  </div>
                </div>
                <Link
                  href={item.href}
                  className="mt-4 inline-flex rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-400/15"
                >
                  Open intake checklist
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Decks In Transit</h2>
            <p className="mt-2 max-w-3xl text-sm text-zinc-400">
              Every active shipment leg shows a tracking reference. Existing carrier codes are preferred; otherwise the shipping-partner feed creates a deterministic reference for ops.
            </p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-zinc-300">
            {snapshot.inTransit.length} active shipment legs
          </div>
        </div>

        {snapshot.inTransit.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-zinc-400">
            No decks are actively in transit right now.
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-3xl border border-white/10">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-[0.2em] text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Deck</th>
                  <th className="px-4 py-3">Flow</th>
                  <th className="px-4 py-3">Lane</th>
                  <th className="px-4 py-3">Tracking</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last movement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-zinc-950/40">
                {snapshot.inTransit.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-4 py-4">
                      <Link href={item.href} className="font-medium text-white hover:text-emerald-300">
                        {item.deckLabel}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-zinc-300">{item.flow}</td>
                    <td className="px-4 py-4 text-zinc-300">
                      {item.fromLabel} to {item.toLabel}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-mono text-sm text-emerald-300">{item.trackingReference}</div>
                      <div className="mt-1 text-xs text-zinc-500">{item.trackingSourceLabel}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-white">{item.statusLabel}</div>
                      {item.autoGenerated ? (
                        <div className="mt-1 text-xs text-sky-200">Auto-created by partner feed</div>
                      ) : (
                        <div className="mt-1 text-xs text-zinc-500">Carrier-provided reference</div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-zinc-300">{formatTimestamp(item.shippedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {snapshot.schemaWarnings.length > 0 ? (
        <div className="mt-6 rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5 text-sm text-yellow-100">
          {snapshot.schemaWarnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}
    </section>
  )
}
