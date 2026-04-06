import FormActionButton from '@/components/form-action-button'
import { createAdminClientOrNull } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  formatSupportCategory,
  formatSupportPriority,
  formatSupportStatus,
  isSupportSchemaMissing,
  SUPPORT_PRIORITIES,
  SUPPORT_STATUSES,
  supportPriorityTone,
  supportStatusTone,
  type SupportTicketRow,
} from '@/lib/support'
import { updateSupportTicketAction } from './actions'

export const dynamic = 'force-dynamic'

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = searchParams ? await searchParams : {}
  const supabase = await createClient()
  const adminSupabase = createAdminClientOrNull() ?? supabase
  const { data, error } = await adminSupabase
    .from('support_tickets')
    .select('*')
    .order('status', { ascending: true })
    .order('created_at', { ascending: false })

  const schemaMissing = isSupportSchemaMissing(error?.message)
  const tickets = !schemaMissing ? ((data ?? []) as SupportTicketRow[]) : []
  const openCount = tickets.filter((ticket) => ticket.status === 'open').length
  const inProgressCount = tickets.filter((ticket) => ticket.status === 'in_progress').length
  const resolvedCount = tickets.filter(
    (ticket) => ticket.status === 'resolved' || ticket.status === 'closed'
  ).length

  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-medium tracking-wide text-sky-200">
            Support Queue
          </div>
          <h2 className="mt-4 text-3xl font-semibold">Support tickets</h2>
          <p className="mt-2 max-w-3xl text-sm text-zinc-400">
            Review incoming issue reports, update priority, and keep response notes attached to each ticket.
          </p>
        </div>
      </div>

      {params.updated === '1' ? (
        <div className="mt-6 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-4 text-sm text-emerald-100">
          Support ticket updated.
        </div>
      ) : null}

      {schemaMissing ? (
        <div className="mt-6 rounded-3xl border border-amber-400/20 bg-amber-400/10 px-5 py-4 text-sm text-amber-100">
          The support system is not provisioned yet. Apply the latest Supabase migration to enable the queue.
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-zinc-900 p-5">
          <div className="text-sm text-zinc-400">Open</div>
          <div className="mt-2 text-3xl font-semibold text-amber-200">{openCount}</div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-zinc-900 p-5">
          <div className="text-sm text-zinc-400">In Progress</div>
          <div className="mt-2 text-3xl font-semibold text-sky-200">{inProgressCount}</div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-zinc-900 p-5">
          <div className="text-sm text-zinc-400">Resolved / Closed</div>
          <div className="mt-2 text-3xl font-semibold text-emerald-200">{resolvedCount}</div>
        </div>
      </div>

      {!schemaMissing && tickets.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-white/10 bg-white/5 p-10 text-center">
          <h3 className="text-xl font-semibold">No support tickets yet</h3>
          <p className="mt-2 text-sm text-zinc-400">New issues from the site-wide support flow will land here.</p>
        </div>
      ) : null}

      {tickets.length > 0 ? (
        <div className="mt-6 space-y-5">
          {tickets.map((ticket) => (
            <form
              key={ticket.id}
              action={updateSupportTicketAction}
              className="rounded-3xl border border-white/10 bg-zinc-900/90 p-6"
            >
              <input type="hidden" name="ticket_id" value={ticket.id} />

              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-3xl">
                  <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                    Ticket #{ticket.id}
                  </div>
                  <h3 className="mt-2 text-2xl font-semibold text-white">{ticket.subject}</h3>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                    {ticket.description}
                  </p>
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

              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_1.5fr]">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Reporter</div>
                  <div className="mt-2 font-medium text-white">{ticket.name?.trim() || 'Unnamed user'}</div>
                  <div className="mt-1 text-zinc-400">{ticket.email}</div>
                  <div className="mt-3 text-xs text-zinc-500">User ID {ticket.user_id ?? 'Guest ticket'}</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Context</div>
                  <div className="mt-2 text-zinc-300">{ticket.url_path?.trim() || 'No URL provided'}</div>
                  <div className="mt-3 text-xs text-zinc-500">Opened {new Date(ticket.created_at).toLocaleString()}</div>
                  <div className="mt-1 text-xs text-zinc-500">Updated {new Date(ticket.updated_at).toLocaleString()}</div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor={`status-${ticket.id}`} className="mb-2 block text-sm text-zinc-400">
                      Status
                    </label>
                    <select
                      id={`status-${ticket.id}`}
                      name="status"
                      defaultValue={ticket.status}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                    >
                      {SUPPORT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {formatSupportStatus(status)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`priority-${ticket.id}`} className="mb-2 block text-sm text-zinc-400">
                      Priority
                    </label>
                    <select
                      id={`priority-${ticket.id}`}
                      name="priority"
                      defaultValue={ticket.priority}
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
              </div>

              <div className="mt-4">
                <label htmlFor={`admin-notes-${ticket.id}`} className="mb-2 block text-sm text-zinc-400">
                  Internal notes
                </label>
                <textarea
                  id={`admin-notes-${ticket.id}`}
                  name="admin_notes"
                  rows={4}
                  defaultValue={ticket.admin_notes ?? ''}
                  placeholder="Summarize next steps, customer follow-up, or what was fixed."
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                />
              </div>

              <FormActionButton
                pendingLabel="Saving update..."
                className="mt-5 rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 transition hover:opacity-90"
              >
                Save Ticket Update
              </FormActionButton>
            </form>
          ))}
        </div>
      ) : null}
    </section>
  )
}
