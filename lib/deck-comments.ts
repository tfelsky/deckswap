export type DeckComment = {
  id: number
  deck_id: number
  user_id: string
  body: string
  created_at?: string | null
  updated_at?: string | null
}

export function isDeckCommentsSchemaMissing(message?: string | null) {
  if (!message) return false

  return (
    message.includes("relation 'public.deck_comments'") ||
    message.includes('relation "public.deck_comments"') ||
    message.includes("Could not find the relation 'public.deck_comments'") ||
    message.includes("Could not find the 'deck_comments' column") ||
    message.includes("Could not find the relation 'deck_comments'")
  )
}

export function formatCommentTimestamp(value?: string | null) {
  if (!value) return 'Recently'

  return new Date(value).toLocaleString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
