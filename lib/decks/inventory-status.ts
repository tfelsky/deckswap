export const INVENTORY_STATUSES = [
  'staged',
  'deck_swap_live',
  'buy_it_now_live',
  'auction_live',
  'auction_pending',
  'checked_out',
  'awaiting_delivery',
  'escrow_pending_shipment',
  'escrow_in_transit',
  'escrow_received',
  'escrow_review',
  'escrow_completed',
  'holiday_pending_receipt',
  'holiday_received',
] as const

export type InventoryStatus = (typeof INVENTORY_STATUSES)[number]
export type InventoryStatusVisibility = 'private' | 'public' | 'completed'

const INVENTORY_STATUS_LABELS: Record<InventoryStatus, string> = {
  staged: 'Staged',
  deck_swap_live: 'DeckSwap Live',
  buy_it_now_live: 'Buy It Now Live',
  auction_live: 'Auction Live',
  auction_pending: 'Auction Pending',
  checked_out: 'Checked Out',
  awaiting_delivery: 'Awaiting Delivery',
  escrow_pending_shipment: 'Escrow Pending Shipment',
  escrow_in_transit: 'Escrow In Transit',
  escrow_received: 'Escrow Received',
  escrow_review: 'Escrow Review',
  escrow_completed: 'Escrow Complete',
  holiday_pending_receipt: 'Holiday Donation Pending Receipt',
  holiday_received: 'Holiday Donation Received',
}

const INVENTORY_STATUS_DESCRIPTIONS: Record<InventoryStatus, string> = {
  staged: 'Saved in your inventory but not actively moving through a sale, trade, or donation flow.',
  deck_swap_live: 'Actively positioned for a deck-for-deck match.',
  buy_it_now_live: 'Available for direct sale at the posted Buy It Now price.',
  auction_live: 'Currently positioned for a live auction sale path.',
  auction_pending: 'Queued for auction or awaiting auction launch confirmation.',
  checked_out: 'Committed to a buyer or transaction and no longer open for new offers.',
  awaiting_delivery: 'On the way to its next owner or recipient.',
  escrow_pending_shipment: 'Accepted into escrow and waiting for shipment.',
  escrow_in_transit: 'In motion within the escrow flow.',
  escrow_received: 'Received into escrow and waiting for review or next steps.',
  escrow_review: 'Under review before release or resolution.',
  escrow_completed: 'Escrow flow is complete.',
  holiday_pending_receipt: 'Committed to the Mythiverse Exchange Holiday program and waiting to be physically received.',
  holiday_received: 'Received for the holiday donation program.',
}

const INVENTORY_STATUS_BADGES: Record<InventoryStatus, string> = {
  staged: 'border-white/10 bg-white/5 text-zinc-300',
  deck_swap_live: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
  buy_it_now_live: 'border-amber-400/20 bg-amber-400/10 text-amber-200',
  auction_live: 'border-orange-400/20 bg-orange-400/10 text-orange-200',
  auction_pending: 'border-orange-400/20 bg-orange-400/10 text-orange-200',
  checked_out: 'border-sky-400/20 bg-sky-400/10 text-sky-200',
  awaiting_delivery: 'border-sky-400/20 bg-sky-400/10 text-sky-200',
  escrow_pending_shipment: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200',
  escrow_in_transit: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200',
  escrow_received: 'border-indigo-400/20 bg-indigo-400/10 text-indigo-200',
  escrow_review: 'border-violet-400/20 bg-violet-400/10 text-violet-200',
  escrow_completed: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
  holiday_pending_receipt: 'border-zinc-500/30 bg-zinc-500/15 text-zinc-200',
  holiday_received: 'border-zinc-500/30 bg-zinc-500/15 text-zinc-200',
}

const INVENTORY_STATUS_VISIBILITY: Record<InventoryStatus, InventoryStatusVisibility> = {
  staged: 'private',
  deck_swap_live: 'public',
  buy_it_now_live: 'public',
  auction_live: 'public',
  auction_pending: 'public',
  checked_out: 'completed',
  awaiting_delivery: 'completed',
  escrow_pending_shipment: 'private',
  escrow_in_transit: 'private',
  escrow_received: 'private',
  escrow_review: 'private',
  escrow_completed: 'completed',
  holiday_pending_receipt: 'private',
  holiday_received: 'private',
}

const LOCKED_STATUSES = new Set<InventoryStatus>([
  'checked_out',
  'awaiting_delivery',
  'escrow_pending_shipment',
  'escrow_in_transit',
  'escrow_received',
  'escrow_review',
  'escrow_completed',
  'holiday_pending_receipt',
  'holiday_received',
])

export function normalizeInventoryStatus(value?: string | null): InventoryStatus {
  const candidate = String(value ?? '').trim() as InventoryStatus
  return INVENTORY_STATUSES.includes(candidate) ? candidate : 'staged'
}

export function getInventoryStatusLabel(status?: string | null) {
  return INVENTORY_STATUS_LABELS[normalizeInventoryStatus(status)]
}

export function getInventoryStatusDescription(status?: string | null) {
  return INVENTORY_STATUS_DESCRIPTIONS[normalizeInventoryStatus(status)]
}

export function getInventoryStatusBadgeClass(status?: string | null) {
  return INVENTORY_STATUS_BADGES[normalizeInventoryStatus(status)]
}

export function isInventoryStatusLocked(status?: string | null) {
  return LOCKED_STATUSES.has(normalizeInventoryStatus(status))
}

export function getInventoryStatusVisibility(status?: string | null): InventoryStatusVisibility {
  return INVENTORY_STATUS_VISIBILITY[normalizeInventoryStatus(status)]
}

export function isInventoryStatusPublic(status?: string | null) {
  return getInventoryStatusVisibility(status) === 'public'
}

export function isInventoryStatusCompleted(status?: string | null) {
  return getInventoryStatusVisibility(status) === 'completed'
}
