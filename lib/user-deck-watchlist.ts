export type UserDeckWatchlistRow = {
  id: number
  user_id: string
  deck_id: number
  created_at?: string | null
  note?: string | null
}

export function isUserDeckWatchlistSchemaMissing(message?: string | null) {
  if (!message) return false

  return (
    message.includes("relation 'public.user_deck_watchlist' does not exist") ||
    message.includes('relation "public.user_deck_watchlist" does not exist') ||
    message.includes("Could not find the table 'public.user_deck_watchlist'") ||
    message.includes('Could not find the table "public.user_deck_watchlist"')
  )
}
