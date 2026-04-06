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

export type NotificationGroup = 'escrow' | 'offers' | 'comments' | 'system'

export type NotificationPresentation = {
  group: NotificationGroup
  groupLabel: string
  typeLabel: string
  actionLabel: string
}

type NotificationCopy = {
  title?: string | null
  body?: string | null
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

export function getNotificationPresentation(type: string): NotificationPresentation {
  if (type.startsWith('trade_offer_')) {
    return {
      group: 'offers',
      groupLabel: 'Trade offers',
      typeLabel: formatNotificationType(type),
      actionLabel: 'Open offer',
    }
  }

  if (
    type.startsWith('trade_payment_') ||
    type.startsWith('trade_shipment_') ||
    type === 'trade_ready_to_ship' ||
    type === 'trade_both_shipments_confirmed' ||
    type === 'trade_ready_to_release' ||
    type === 'trade_completed' ||
    type === 'trade_disputed' ||
    type === 'trade_draft_created'
  ) {
    return {
      group: 'escrow',
      groupLabel: 'Trade and escrow',
      typeLabel: formatNotificationType(type),
      actionLabel: 'Open trade deal',
    }
  }

  if (type === 'deck_comment_added') {
    return {
      group: 'comments',
      groupLabel: 'Comments',
      typeLabel: 'Deck comment',
      actionLabel: 'Open discussion',
    }
  }

  return {
    group: 'system',
    groupLabel: 'System updates',
    typeLabel: formatNotificationType(type),
    actionLabel: 'Open',
  }
}

export function formatNotificationType(type: string) {
  switch (type) {
    case 'trade_draft_created':
      return 'Trade deal ready'
    case 'trade_payment_requested':
      return 'Payment requested'
    case 'trade_payment_marked_paid':
      return 'Payment confirmed'
    case 'trade_ready_to_ship':
      return 'Ready to ship'
    case 'trade_shipment_marked_sent':
      return 'Shipment confirmed'
    case 'trade_both_shipments_confirmed':
      return 'Both shipments confirmed'
    case 'trade_shipment_received_at_escrow':
      return 'Received at escrow hub'
    case 'trade_ready_to_release':
      return 'Ready to release'
    case 'trade_completed':
      return 'Trade completed'
    case 'trade_disputed':
      return 'Trade under review'
    case 'trade_offer_created':
      return 'Offer received'
    case 'trade_offer_countered':
      return 'Counteroffer received'
    case 'trade_offer_accepted':
      return 'Offer accepted'
    case 'trade_offer_declined':
      return 'Offer declined'
    case 'trade_offer_cancelled':
      return 'Offer cancelled'
    case 'deck_comment_added':
      return 'Deck comment'
    default:
      return type.replace(/_/g, ' ')
  }
}

function replaceTradeDraftLanguage(value?: string | null) {
  if (!value) return value ?? null

  return value
    .replace(/\bTrade Draft\b/g, 'Trade Deal')
    .replace(/\btrade draft\b/g, 'trade deal')
    .replace(/\btrade drafts\b/g, 'trade deals')
    .replace(/\bdraft page\b/g, 'trade deal page')
}

export function getNotificationCopy(notification: NotificationCopy) {
  return {
    title: replaceTradeDraftLanguage(notification.title),
    body: replaceTradeDraftLanguage(notification.body),
  }
}
