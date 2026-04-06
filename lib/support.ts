export const SUPPORT_CATEGORIES = [
  'bug',
  'trade',
  'order',
  'listing',
  'account',
  'billing',
  'general',
] as const

export const SUPPORT_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const

export const SUPPORT_STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number]
export type SupportPriority = (typeof SUPPORT_PRIORITIES)[number]
export type SupportStatus = (typeof SUPPORT_STATUSES)[number]

export type SupportTicketRow = {
  id: number
  created_at: string
  updated_at: string
  resolved_at?: string | null
  user_id?: string | null
  email: string
  name?: string | null
  subject: string
  category: SupportCategory
  priority: SupportPriority
  status: SupportStatus
  description: string
  url_path?: string | null
  admin_notes?: string | null
}

export function isSupportSchemaMissing(message?: string | null) {
  if (!message) return false

  return (
    message.includes("relation 'public.support_tickets'") ||
    message.includes('relation "public.support_tickets"') ||
    message.includes("Could not find the relation 'public.support_tickets'")
  )
}

export function normalizeSupportCategory(value: unknown): SupportCategory {
  const candidate = String(value || '').trim().toLowerCase()
  return SUPPORT_CATEGORIES.includes(candidate as SupportCategory)
    ? (candidate as SupportCategory)
    : 'general'
}

export function normalizeSupportPriority(value: unknown): SupportPriority {
  const candidate = String(value || '').trim().toLowerCase()
  return SUPPORT_PRIORITIES.includes(candidate as SupportPriority)
    ? (candidate as SupportPriority)
    : 'normal'
}

export function normalizeSupportStatus(value: unknown): SupportStatus {
  const candidate = String(value || '').trim().toLowerCase()
  return SUPPORT_STATUSES.includes(candidate as SupportStatus)
    ? (candidate as SupportStatus)
    : 'open'
}

export function formatSupportCategory(value?: string | null) {
  switch (value) {
    case 'bug':
      return 'Bug report'
    case 'trade':
      return 'Trade issue'
    case 'order':
      return 'Order issue'
    case 'listing':
      return 'Listing issue'
    case 'account':
      return 'Account help'
    case 'billing':
      return 'Billing'
    default:
      return 'General support'
  }
}

export function formatSupportPriority(value?: string | null) {
  switch (value) {
    case 'low':
      return 'Low'
    case 'high':
      return 'High'
    case 'urgent':
      return 'Urgent'
    default:
      return 'Normal'
  }
}

export function formatSupportStatus(value?: string | null) {
  switch (value) {
    case 'in_progress':
      return 'In progress'
    case 'resolved':
      return 'Resolved'
    case 'closed':
      return 'Closed'
    default:
      return 'Open'
  }
}

export function supportStatusTone(value?: string | null) {
  switch (value) {
    case 'resolved':
      return 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-100'
    case 'closed':
      return 'border border-zinc-500/20 bg-zinc-500/10 text-zinc-300'
    case 'in_progress':
      return 'border border-sky-400/20 bg-sky-400/10 text-sky-100'
    default:
      return 'border border-amber-400/20 bg-amber-400/10 text-amber-100'
  }
}

export function supportPriorityTone(value?: string | null) {
  switch (value) {
    case 'urgent':
      return 'border border-red-400/20 bg-red-400/10 text-red-100'
    case 'high':
      return 'border border-orange-400/20 bg-orange-400/10 text-orange-100'
    case 'low':
      return 'border border-zinc-500/20 bg-zinc-500/10 text-zinc-300'
    default:
      return 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-100'
  }
}
