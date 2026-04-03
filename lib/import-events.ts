type LogDeckImportEventArgs = {
  deckId: number
  actorUserId?: string | null
  sourceType?: string | null
  eventType: string
  severity?: 'info' | 'warning' | 'error'
  message: string
  details?: Record<string, unknown> | null
}

export type DeckImportEventRow = {
  id: number
  deck_id: number
  actor_user_id?: string | null
  source_type?: string | null
  event_type: string
  severity: 'info' | 'warning' | 'error'
  message: string
  details?: Record<string, unknown> | null
  created_at?: string | null
}

export function isDeckImportEventsSchemaMissing(message?: string | null) {
  if (!message) return false

  return (
    message.includes("relation 'public.deck_import_events'") ||
    message.includes('relation "public.deck_import_events"') ||
    message.includes("Could not find the relation 'public.deck_import_events'")
  )
}

export async function logDeckImportEvent(
  supabase: {
    from: (table: string) => {
      insert: (
        value: unknown
      ) => PromiseLike<{ error?: { message?: string | null } | null }>
    }
  },
  args: LogDeckImportEventArgs
) {
  const result = await supabase.from('deck_import_events').insert({
    deck_id: args.deckId,
    actor_user_id: args.actorUserId ?? null,
    source_type: args.sourceType ?? null,
    event_type: args.eventType,
    severity: args.severity ?? 'info',
    message: args.message,
    details: args.details ?? null,
  })

  if (result.error && !isDeckImportEventsSchemaMissing(result.error.message)) {
    console.error('Failed to write deck import event:', result.error)
  }
}

export function formatDeckImportEventTimestamp(value?: string | null) {
  if (!value) return 'Recently'

  return new Date(value).toLocaleString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
