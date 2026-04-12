type LogSingleImportEventArgs = {
  singleInventoryItemId?: number | null
  actorUserId?: string | null
  provider?: string | null
  sourceScope?: string | null
  eventType: string
  severity?: 'info' | 'warning' | 'error'
  message: string
  details?: Record<string, unknown> | null
}

export function isSingleImportSchemaMissing(message?: string | null) {
  if (!message) return false

  return (
    message.includes("relation 'public.single_inventory_items'") ||
    message.includes('relation "public.single_inventory_items"') ||
    message.includes("relation 'public.external_single_sources'") ||
    message.includes('relation "public.external_single_sources"') ||
    message.includes("relation 'public.external_single_imports'") ||
    message.includes('relation "public.external_single_imports"') ||
    message.includes("relation 'public.single_import_events'") ||
    message.includes('relation "public.single_import_events"') ||
    message.includes("Could not find the relation 'public.single_inventory_items'") ||
    message.includes("Could not find the relation 'public.external_single_sources'") ||
    message.includes("Could not find the relation 'public.external_single_imports'") ||
    message.includes("Could not find the relation 'public.single_import_events'")
  )
}

export async function logSingleImportEvent(
  supabase: {
    from: (table: string) => {
      insert: (
        value: unknown
      ) => PromiseLike<{ error?: { message?: string | null } | null }>
    }
  },
  args: LogSingleImportEventArgs
) {
  const result = await supabase.from('single_import_events').insert({
    single_inventory_item_id: args.singleInventoryItemId ?? null,
    actor_user_id: args.actorUserId ?? null,
    provider: args.provider ?? null,
    source_scope: args.sourceScope ?? null,
    event_type: args.eventType,
    severity: args.severity ?? 'info',
    message: args.message,
    details: args.details ?? null,
  })

  if (result.error && !isSingleImportSchemaMissing(result.error.message)) {
    console.error('Failed to write single import event:', result.error)
  }
}
