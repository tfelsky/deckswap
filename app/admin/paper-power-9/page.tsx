import { AdminOnlyCallout } from '@/components/admin-only-callout'
import { Badge } from '@/components/ui/badge'
import {
  buildPaperPowerNineVideoScript,
  loadAdminPaperPowerNineWorkspace,
} from '@/lib/admin/paper-power-nine'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function getSingleParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = searchParams[key]
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

function formatDate(value?: string | null) {
  if (!value) return 'Recently'
  return new Date(value).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default async function AdminPaperPowerNinePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const resolvedSearchParams = await searchParams
  const submissionId = Number(getSingleParam(resolvedSearchParams, 'submission') || 0)
  const workspace = await loadAdminPaperPowerNineWorkspace(submissionId > 0 ? submissionId : null)
  const script = workspace.selected ? buildPaperPowerNineVideoScript(workspace.selected) : null

  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="space-y-6">
          <AdminOnlyCallout
            title="YouTube Production Workspace"
            description="This page is only for internal script prep, sponsor framing, and downloadable visual exports for Personal Power 9 episodes."
          />

          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Submissions</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Pick a submission to generate the episode script and PNG export.
                </p>
              </div>
              <Badge className="border-white/10 bg-white/5 text-zinc-200">
                {workspace.submissions.length} loaded
              </Badge>
            </div>

            {workspace.schemaMissing ? (
              <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
                Personal Power 9 tables are not available in this environment yet. Run the latest
                Supabase migration first.
              </div>
            ) : null}

            <div className="mt-5 space-y-3">
              {workspace.submissions.length > 0 ? (
                workspace.submissions.map((submission) => {
                  const isActive = workspace.selected?.submission.id === submission.id

                  return (
                    <Link
                      key={submission.id}
                      href={`/admin/paper-power-9?submission=${submission.id}`}
                      className={`block rounded-2xl border p-4 transition ${
                        isActive
                          ? 'border-amber-300/40 bg-amber-300/10'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium text-white">{submission.credit_name}</div>
                        <div className="text-xs text-zinc-400">#{submission.id}</div>
                      </div>
                      <div className="mt-2 text-sm text-zinc-300">
                        {submission.theme || 'No theme supplied'}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-400">
                        <span>{formatDate(submission.created_at)}</span>
                        <span>{submission.exact_match_count ?? 0}/9 exact matches</span>
                        <span>{submission.status || 'submitted'}</span>
                      </div>
                    </Link>
                  )
                })
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-400">
                  No Personal Power 9 submissions have been saved yet.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {workspace.selected && script ? (
            <>
              <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium tracking-[0.18em] text-emerald-200">
                      Admin Only Script
                    </div>
                    <h2 className="mt-4 text-3xl font-semibold tracking-tight">{script.title}</h2>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300">
                      Sponsor-ready 10-minute episode outline with Mythivex intro mention, a
                      30-second midroll, end-card CTA, and prompts for likes, shares, subscriptions,
                      comments, and direct submissions on Mythivex.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <a
                      href={`/api/admin/paper-power-9/submissions/${workspace.selected.submission.id}/image`}
                      className="rounded-2xl bg-amber-300 px-4 py-2.5 text-sm font-medium text-zinc-950 hover:opacity-90"
                    >
                      Download PNG
                    </a>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
                  <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-5">
                    <div className="text-sm font-medium text-zinc-200">Full script</div>
                    <pre className="mt-4 whitespace-pre-wrap text-sm leading-7 text-zinc-300">
                      {script.fullScript}
                    </pre>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-5">
                      <div className="text-sm font-medium text-zinc-200">Submission brief</div>
                      <div className="mt-4 space-y-3 text-sm text-zinc-300">
                        <p>
                          <span className="text-zinc-500">Creator:</span>{' '}
                          {workspace.selected.submission.credit_name}
                        </p>
                        <p>
                          <span className="text-zinc-500">Theme:</span>{' '}
                          {workspace.selected.submission.theme || 'No theme supplied'}
                        </p>
                        <p>
                          <span className="text-zinc-500">Created:</span>{' '}
                          {formatDate(workspace.selected.submission.created_at)}
                        </p>
                        <p>
                          <span className="text-zinc-500">Exact matches:</span>{' '}
                          {workspace.selected.submission.exact_match_count ?? 0}/9
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-5">
                      <div className="text-sm font-medium text-zinc-200">Episode beats</div>
                      <div className="mt-4 space-y-3">
                        {script.sections.map((section) => (
                          <div
                            key={`${section.timestamp}-${section.title}`}
                            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                          >
                            <div className="text-xs uppercase tracking-[0.18em] text-amber-200">
                              {section.timestamp}
                            </div>
                            <div className="mt-2 text-sm font-medium text-white">{section.title}</div>
                            <p className="mt-2 text-sm leading-6 text-zinc-300">{section.body}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-5">
                      <div className="text-sm font-medium text-zinc-200">Card tier list</div>
                      <div className="mt-4 space-y-3">
                        {script.tierList.map(({ card, rating }) => (
                          <div
                            key={`${card.id}-${rating.tier}`}
                            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-medium text-white">
                                {card.card_name || card.submitted_name}
                              </div>
                              <div
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  rating.tier === 'S'
                                    ? 'bg-emerald-400/15 text-emerald-200'
                                    : rating.tier === 'A'
                                      ? 'bg-sky-400/15 text-sky-200'
                                      : rating.tier === 'B'
                                        ? 'bg-amber-300/15 text-amber-100'
                                        : 'bg-rose-400/15 text-rose-100'
                                }`}
                              >
                                {rating.tier}-Tier
                              </div>
                            </div>
                            <div className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
                              {rating.label}
                            </div>
                            <p className="mt-2 text-sm leading-6 text-zinc-300">{rating.opinion}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-semibold">Card export preview</h3>
                    <p className="mt-2 text-sm text-zinc-400">
                      Centered isolated-card sheet for internal thumbnails, overlays, and download.
                    </p>
                  </div>
                  <a
                    href={`/api/admin/paper-power-9/submissions/${workspace.selected.submission.id}/image`}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white hover:bg-white/10"
                  >
                    Open export
                  </a>
                </div>

                <div className="mt-5 overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950">
                  <img
                    src={`/api/admin/paper-power-9/submissions/${workspace.selected.submission.id}/image`}
                    alt="Personal Power 9 export preview"
                    className="w-full"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6 text-sm text-zinc-400">
              Pick a Personal Power 9 submission to generate the admin script workspace.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
