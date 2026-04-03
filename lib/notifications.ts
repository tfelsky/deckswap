export type NotificationRow = {
  id: number
  user_id: string
  actor_user_id?: string | null
  type: string
  title: string
  body?: string | null
  href?: string | null
  read_at?: string | null
  metadata?: Record<string, unknown> | null
  created_at?: string | null
}

type CreateNotificationArgs = {
  userId: string
  actorUserId?: string | null
  type: string
  title: string
  body?: string | null
  href?: string | null
  metadata?: Record<string, unknown> | null
}

export function isNotificationsSchemaMissing(message?: string | null) {
  if (!message) return false

  return (
    message.includes("relation 'public.notifications'") ||
    message.includes('relation "public.notifications"') ||
    message.includes("Could not find the relation 'public.notifications'")
  )
}

export async function createNotification(
  supabase: any,
  args: CreateNotificationArgs
) {
  const result = await supabase.from('notifications').insert({
    user_id: args.userId,
    actor_user_id: args.actorUserId ?? null,
    type: args.type,
    title: args.title,
    body: args.body ?? null,
    href: args.href ?? null,
    metadata: args.metadata ?? null,
  })

  if (result.error && !isNotificationsSchemaMissing(result.error.message)) {
    console.error('Failed to create notification:', result.error)
  }
}

export async function getUnreadNotificationsCount(
  supabase: any,
  userId: string
) {
  const result = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null)

  if (result.error && !isNotificationsSchemaMissing(result.error.message)) {
    console.error('Failed to count notifications:', result.error)
  }

  return isNotificationsSchemaMissing(result.error?.message) ? 0 : Number(result.count ?? 0)
}

export function formatNotificationTimestamp(value?: string | null) {
  if (!value) return 'Recently'

  return new Date(value).toLocaleString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
