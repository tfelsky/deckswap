export type DeckPriceSnapshot = {
  captured_at: string
  price_total_usd_foil: number | null
  snapshot_type?: string | null
}

export function formatPercentChange(value: number | null) {
  if (value == null || !Number.isFinite(value)) return null
  const prefix = value > 0 ? '+' : ''
  return `${prefix}${value.toFixed(1)}%`
}

export function calculatePercentChange(current: number, previous: number | null | undefined) {
  if (previous == null || !Number.isFinite(previous) || previous <= 0) return null
  return ((current - previous) / previous) * 100
}

export function findNearestSnapshotBeforeDays(
  snapshots: DeckPriceSnapshot[],
  days: number,
  now = new Date()
) {
  const threshold = new Date(now)
  threshold.setDate(threshold.getDate() - days)

  return snapshots.find((snapshot) => {
    const capturedAt = new Date(snapshot.captured_at)
    return capturedAt.getTime() <= threshold.getTime()
  }) ?? null
}

export function findImportSnapshot(snapshots: DeckPriceSnapshot[]) {
  return (
    snapshots.find((snapshot) => snapshot.snapshot_type === 'import') ??
    snapshots[snapshots.length - 1] ??
    null
  )
}
