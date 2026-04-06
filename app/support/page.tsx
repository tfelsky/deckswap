import Link from 'next/link'
import { Header } from '@/components/header'
import FormActionButton from '@/components/form-action-button'
import { createAdminClientOrNull } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  formatSupportCategory,
  formatSupportPriority,
  formatSupportStatus,
  isSupportSchemaMissing,
  SUPPORT_CATEGORIES,
  SUPPORT_PRIORITIES,
  supportPriorityTone,
  supportStatusTone,
  type SupportTicketRow,
} from '@/lib/support'
import { submitSupportTicketAction } from './actions'

export const dynamic = 'force-dynamic'

function messageForSearch(searchParams: Record<string, string | string[] | undefined>) {
  if (searchParams.submitted === '1') {
    return {
      tone: 'success' as const,
      text: 'Support ticket submitted. We saved the issue and it is now in the queue.',
    }
  }

  if (searchParams.error === 'missing_fields') {
    return {
      tone: 'error' as const,
      text: 'Please add an email, a subject, and a short description before submitting.',
    }
  }

  if (searchParams.error === 'support_not_ready') {
    return {
      tone: 'error' as const,
      text: 'Support ticket storage is not set up yet. Run the latest Supabase migration, then try again.',
    }
  }

  if (searchParams.error === 'submit_failed') {
    return {
      tone: 'error' as const,
      text: 'We could not save your ticket just now. Please try again.',
    }
  }

  return null
}

export default async function SupportPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = searchParams ? await searchParams : {}
  const message = messageForSearch(params)
  const supabase = await createClient()
  const adminSupabase = createAdminClientOrNull() ?? supabase
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [profileResult, ticketsResult] = await Promise.all([
    user
      ? supabase.from('profiles').select('display_name').eq('user_id', user.id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    user
      ? adminSupabase
          .from('support_tickets')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as SupportTicketRow[], error: null }),
  ])

  const schemaMissing = isSupportSchemaMissing(ticketsResult.error?.message)
  const tickets = !schemaMissing ? ((ticketsResult.data ?? []) as SupportTicketRow[]) : []
  const displayName = String((profileResult.data as { display_name?: string | null } | null)?.display_name || '').trim()

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Header />

      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-950 pt-24">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="inline-flex rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-medium tracking-wide text-sky-200">
                Help Center
              </div>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                Report issues and keep a paper trail.
              </h1>
              <p className="mt-4 max-w-2xl text-base text-zinc-400 sm:text-lg">
                Use support tickets for bugs, trade issues, account problems, or anything on the site that needs follow-up from the team.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="text-sm text-zinc-400">Best for</div>
                  <div className="mt-2 text-lg font-semibold text-white">Platform issues</div>
                  <p className="mt-2 text-sm text-zinc-500">Broken flows, missing data, blocked trades, or unexpected errors.</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="text-sm text-zinc-400">Response context</div>
                  <div className="mt-2 text-lg font-semibold text-white">Page-aware</div>
                  <p className="mt-2 text-sm text-zinc-500">Include the page URL so support can jump straight into the right workflow.</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="text-sm text-zinc-400">History</div>
                  <div className="mt-2 text-lg font-semibold text-white">Tracked</div>
                  <p className="mt-2 text-sm text-zinc-500">Signed-in users can see prior tickets and their current status here.</p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-zinc-900/90 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.25)]">
              <h2 className="text-2xl font-semibold">Open a ticket</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Keep it short and specific. We can always ask for more detail after intake.
              </p>

              {message ? (
                <div
                  className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${
                    message.tone === 'success'
                      ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100'
                      : 'border-red-400/20 bg-red-400/10 text-red-100'
                  }`}
                >
                  {message.text}
                </div>
              ) : null}

              {schemaMissing ? (
                <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                  The support table is not provisioned yet. Run the latest Supabase migration to enable ticketing.
                </div>
              ) : null}

              <form action={submitSupportTicketAction} className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="support-name" className="mb-2 block text-sm text-zinc-400">
                      Name
                    </label>
                    <input
                      id="support-name"
                      name="name"
                      defaultValue={displayName}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="support-email" className="mb-2 block text-sm text-zinc-400">
                      Email
                    </label>
                    <input
                      id="support-email"
                      name="email"
                      type="email"
                      required
                      defaultValue={user?.email ?? ''}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="support-subject" className="mb-2 block text-sm text-zinc-400">
                    Subject
                  </label>
                  <input
                    id="support-subject"
                    name="subject"
                    required
                    placeholder="Example: Trade payment screen is stuck"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="support-category" className="mb-2 block text-sm text-zinc-400">
                      Category
                    </label>
                    <select
                      id="support-category"
                      name="category"
                      defaultValue="general"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                    >
                      {SUPPORT_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {formatSupportCategory(category)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="support-priority" className="mb-2 block text-sm text-zinc-400">
                      Priority
                    </label>
                    <select
                      id="support-priority"
                      name="priority"
                      defaultValue="normal"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                    >
                      {SUPPORT_PRIORITIES.map((priority) => (
                        <option key={priority} value={priority}>
                          {formatSupportPriority(priority)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="support-url" className="mb-2 block text-sm text-zinc-400">
                    Page URL
                  </label>
                  <input
                    id="support-url"
                    name="url_path"
                    placeholder="/trade-offers/123 or full URL"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="support-description" className="mb-2 block text-sm text-zinc-400">
                    What happened
                  </label>
                  <textarea
                    id="support-description"
                    name="description"
                    required
                    rows={6}
                    placeholder="Tell us what you expected, what happened instead, and whether it is blocking a trade or order."
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                  />
                </div>

                <FormActionButton
                  pendingLabel="Submitting ticket..."
                  disabled={schemaMissing}
                  className="w-full rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Submit Support Ticket
                </FormActionButton>
              </form>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-semibold">Your ticket history</h2>
            <p className="mt-2 text-sm text-zinc-400">
              {user
                ? 'Recent tickets tied to your account appear here.'
                : 'Sign in to keep ticket history tied to your account and view updates here.'}
            </p>
          </div>
          {!user ? (
            <Link
              href="/sign-in"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white hover:bg-white/10"
            >
              Sign in to view history
            </Link>
          ) : null}
        </div>

        {user && !schemaMissing && tickets.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-white/10 bg-white/5 p-10 text-center">
            <h3 className="text-xl font-semibold">No tickets yet</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Once you submit an issue, it will show up here with its current support status.
            </p>
          </div>
        ) : null}

        {user && tickets.length > 0 ? (
          <div className="mt-6 grid gap-4">
            {tickets.map((ticket) => (
              <article key={ticket.id} className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      Ticket #{ticket.id}
                    </div>
                    <h3 className="mt-2 text-xl font-semibold text-white">{ticket.subject}</h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-300">{ticket.description}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs ${supportStatusTone(ticket.status)}`}>
                      {formatSupportStatus(ticket.status)}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs ${supportPriorityTone(ticket.priority)}`}>
                      {formatSupportPriority(ticket.priority)}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                      {formatSupportCategory(ticket.category)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3 text-xs text-zinc-500">
                  <span>Opened {new Date(ticket.created_at).toLocaleString()}</span>
                  <span>Updated {new Date(ticket.updated_at).toLocaleString()}</span>
                  {ticket.url_path ? <span>Context {ticket.url_path}</span> : null}
                </div>

                {ticket.admin_notes?.trim() ? (
                  <div className="mt-4 rounded-2xl border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-sm text-sky-50">
                    <div className="text-xs uppercase tracking-[0.18em] text-sky-200/80">Internal update</div>
                    <p className="mt-2 whitespace-pre-wrap">{ticket.admin_notes}</p>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}

        {schemaMissing ? (
          <div className="mt-6 rounded-3xl border border-amber-400/20 bg-amber-400/10 px-5 py-4 text-sm text-amber-100">
            Support history will appear here after the support migration is applied.
          </div>
        ) : null}
      </section>
    </main>
  )
}
