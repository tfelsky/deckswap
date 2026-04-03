import { getTrendWatcherReport } from '@/lib/admin/trend-watcher'

export const dynamic = 'force-dynamic'

export default async function AdminTrendsPage() {
  const report = await getTrendWatcherReport()

  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-2xl font-semibold">Trend Watcher</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Recent Magic news pulled from official Wizards pages and marketplace-adjacent MTG content sources.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">Official Headlines</div>
                <div className="mt-2 text-3xl font-semibold">{report.official.length}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">Marketplace Headlines</div>
                <div className="mt-2 text-3xl font-semibold">{report.marketplace.length}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-zinc-400">Theme Signals</div>
                <div className="mt-2 text-3xl font-semibold text-emerald-300">
                  {report.themes.length}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-2xl font-semibold">Official Source Watch</h2>
            <div className="mt-5 space-y-3">
              {report.official.length > 0 ? (
                report.official.map((item) => (
                  <a
                    key={`${item.source}-${item.url}`}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10"
                  >
                    <div className="text-xs uppercase tracking-wide text-emerald-300/80">
                      {item.source}
                    </div>
                    <div className="mt-2 text-base font-medium text-white">{item.title}</div>
                  </a>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-zinc-400">
                  No official headlines were parsed this run.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-2xl font-semibold">Marketplace Source Watch</h2>
            <div className="mt-5 space-y-3">
              {report.marketplace.length > 0 ? (
                report.marketplace.map((item) => (
                  <a
                    key={`${item.source}-${item.url}`}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10"
                  >
                    <div className="text-xs uppercase tracking-wide text-emerald-300/80">
                      {item.source}
                    </div>
                    <div className="mt-2 text-base font-medium text-white">{item.title}</div>
                  </a>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-zinc-400">
                  No marketplace headlines were parsed this run.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-2xl font-semibold">Theme Read</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Repeated terms across the current headline set.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {report.themes.length > 0 ? (
                report.themes.map((theme) => (
                  <span
                    key={theme}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-zinc-200"
                  >
                    {theme}
                  </span>
                ))
              ) : (
                <span className="text-sm text-zinc-400">No themes extracted yet.</span>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-2xl font-semibold">Viral Content Prompt</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Use this as a starting point for rapid content iteration based on live MTG signals.
            </p>

            <pre className="mt-5 overflow-x-auto rounded-2xl border border-white/10 bg-zinc-950 p-4 text-xs leading-6 text-zinc-200 whitespace-pre-wrap">
              {report.viralPrompt}
            </pre>
          </div>
        </div>
      </div>
    </section>
  )
}
