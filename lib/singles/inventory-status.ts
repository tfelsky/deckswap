export const SINGLE_INVENTORY_STATUSES = [
  'staged',
  'buy_it_now_live',
  'checked_out',
  'completed',
] as const

export type SingleInventoryStatus = (typeof SINGLE_INVENTORY_STATUSES)[number]
export type SingleInventoryVisibility = 'private' | 'public' | 'completed'

const STATUS_LABELS: Record<SingleInventoryStatus, string> = {
  staged: 'Staged',
  buy_it_now_live: 'Buy It Now Live',
  checked_out: 'Checked Out',
  completed: 'Completed',
}

const STATUS_DESCRIPTIONS: Record<SingleInventoryStatus, string> = {
  staged: 'Saved in your private singles inventory and not yet visible in the marketplace.',
  buy_it_now_live: 'Visible for direct purchase.',
  checked_out: 'Committed to an order and no longer open for new buyers.',
  completed: 'Closed out and no longer part of active inventory.',
}

const STATUS_BADGES: Record<SingleInventoryStatus, string> = {
  staged: 'border-white/10 bg-white/5 text-zinc-300',
  buy_it_now_live: 'border-amber-400/20 bg-amber-400/10 text-amber-200',
  checked_out: 'border-sky-400/20 bg-sky-400/10 text-sky-200',
  completed: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
}

const STATUS_VISIBILITY: Record<SingleInventoryStatus, SingleInventoryVisibility> = {
  staged: 'private',
  buy_it_now_live: 'public',
  checked_out: 'completed',
  completed: 'completed',
}

export function normalizeSingleInventoryStatus(value?: string | null): SingleInventoryStatus {
  const candidate = String(value ?? '').trim() as SingleInventoryStatus
  return SINGLE_INVENTORY_STATUSES.includes(candidate) ? candidate : 'staged'
}

export function getSingleInventoryStatusLabel(value?: string | null) {
  return STATUS_LABELS[normalizeSingleInventoryStatus(value)]
}

export function getSingleInventoryStatusDescription(value?: string | null) {
  return STATUS_DESCRIPTIONS[normalizeSingleInventoryStatus(value)]
}

export function getSingleInventoryStatusBadgeClass(value?: string | null) {
  return STATUS_BADGES[normalizeSingleInventoryStatus(value)]
}

export function getSingleInventoryVisibility(value?: string | null) {
  return STATUS_VISIBILITY[normalizeSingleInventoryStatus(value)]
}
