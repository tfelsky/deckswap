export type UserDeckPassRow = {
  id: number
  user_id: string
  deck_id: number
  created_at?: string | null
  reason?: string | null
}

export function isUserDeckPassesSchemaMissing(message?: string | null) {
  if (!message) return false

  return (
    message.includes("relation 'public.user_deck_passes' does not exist") ||
    message.includes('relation "public.user_deck_passes" does not exist') ||
    message.includes("Could not find the table 'public.user_deck_passes'") ||
    message.includes('Could not find the table "public.user_deck_passes"')
  )
}
