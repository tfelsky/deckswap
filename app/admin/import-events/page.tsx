import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAdminAccessForUser } from '@/lib/admin/access'
import {
  formatDeckImportEventTimestamp,
  isDeckImportEventsSchemaMissing,
  type DeckImportEventRow,
} from '@/lib/import-events'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 100

const SEVERITY_OPTIONS = ['all', 'info', 'warning', 'error'] as const

type SeverityFilter = (typeof SEVERITY_OPTIONS)[number]

function severityTone(severity: string) {
  switch (severity) {
    case 'error':
      return 'border-red-400/20 bg-red-400/10 text-red-200'
    case 'warning':
      return 'border-amber-400/20 bg-amber-400/10 text-amber-100'
    default:
      return 'border-white/10 bg-white/5 text-zinc-300'
  }
}

function parseSeverity(value?: string | string[]): SeverityFilter {
  const candidate = Array.isArray(value) ? value[0] : value
  return SEVERITY_OPTIONS.includes(candidate as SeverityFilter)
    ? (candidate as SeverityFilter)
    : 'all'
}

function parseSingle(value?: string | string[]) {
  const candidate = Array.isArray(value) ? value[0] : value
  return candidate?.trim() || ''
}

function buildFilterHref(severity: SeverityFilter, eventType: string) {
  const params = new URLSearchParams()
  if (severity !== 'all') params.set('severity', severity)
  if (eventType) params.set('eventType', eventType)
  const query = params.toString()
  return query ? `/admin/import-events?${query}` : '/admin/import-events'
}

export default async function AdminImportEventsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const access = await getAdminAccessForUser(user)

  if (!user || !access.isAdmin) {
    redirect('/decks')
  }

  const params = (await searchParams) ?? {}
  const severity = parseSeverity(params.severity)
  const eventType = parseSingle(params.eventType)

  let query = supabase
    .from('deck_import_events')
    .select('id, deck_id, actor_user_id, source_type, event_type, severity, message, details, created_at')
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE)

  if (severity !== 'all') {
    query = query.eq('severity', severity)
  }
  if (eventType) {
    query = query.eq('event_type', eventType)
  }

  const { data, error } = await query

  const schemaMissing = isDeckImportEventsSchemaMissing(error?.message)
  const events = schemaMissing || error ? [] : ((data ?? []) as DeckImportEventRow[])
  const eventTypes = [...new Set(events.map((event) => event.event_type))].sort()
  const errorCount = events.filter((event) => event.severity === 'error').length
  const warningCount = events.filter((event) => event.severity === 'warning').length

  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Import Diagnostics</h2>
          <p className="mt-2 max-w-3xl text-zinc-400">
            Recent deck import and enrichment events. Use this to spot failing imports, parsing
            problems, and enrichment gaps without waiting for user reports.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 text-sm">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2">
            Showing <span className="font-semibold text-white">{events.length}</span> events
          </div>
          <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-2 text-red-200">
            {errorCount} errors
          </div>
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-amber-100">
            {warningCount} warnings
          </div>
        </div>
      </div>

      {schemaMissing ? (
        <div className="mt-8 rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-6 text-sm text-yellow-100">
          The <code>deck_import_events</code> table is not available yet. Run the deck import
          events migration in <code>docs/sql/deck-import-events.sql</code> to enable import
          diagnostics.
        </div>
      ) : error ? (
        <div className="mt-8 rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-200">
          {error.message}
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-zinc-500">Severity:</span>
            {SEVERITY_OPTIONS.map((option) => (
              <Link
                key={option}
                href={buildFilterHref(option, eventType)}
                className={`rounded-xl border px-3 py-1.5 capitalize ${
                  severity === option
                    ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                    : 'border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10'
                }`}
              >
                {option}
              </Link>
            ))}

            {eventType ? (
              <Link
                href={buildFilterHref(severity, '')}
                className="ml-2 rounded-xl border border-sky-400/20 bg-sky-400/10 px-3 py-1.5 text-sky-100 hover:bg-sky-400/20"
              >
                Event: {eventType} ✕
              </Link>
            ) : null}
          </div>

          {eventTypes.length > 1 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-zinc-500">Filter by event type:</span>
              {eventTypes.map((type) => (
                <Link
                  key={type}
                  href={buildFilterHref(severity, type)}
                  className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-zinc-300 hover:bg-white/10"
                >
                  {type}
                </Link>
              ))}
            </div>
          ) : null}

          {events.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-8 text-sm text-zinc-400">
              No import events match the current filters.
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-white/10 bg-zinc-900 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 font-medium capitalize ${severityTone(event.severity)}`}
                    >
                      {event.severity}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-zinc-300">
                      {event.event_type}
                    </span>
                    {event.source_type ? (
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-zinc-400">
                        {event.source_type}
                      </span>
                    ) : null}
                    <span className="text-zinc-500">
                      {formatDeckImportEventTimestamp(event.created_at)}
                    </span>
                    <Link
                      href={`/decks/${event.deck_id}`}
                      className="ml-auto rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-zinc-300 hover:bg-white/10"
                    >
                      Deck #{event.deck_id}
                    </Link>
                  </div>

                  <p className="mt-3 text-sm text-zinc-200">{event.message}</p>

                  {event.details && Object.keys(event.details).length > 0 ? (
                    <pre className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-zinc-950 p-3 text-xs text-zinc-400">
                      {JSON.stringify(event.details, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}
