'use server'

import { refreshCommanderFitsForUser } from '@/lib/edhrec/commander-fits'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'

function isCommanderFitsSchemaMissing(message?: string | null) {
  if (!message) return false

  return (
    message.includes("relation 'public.edhrec_card_commander_recs'") ||
    message.includes('relation "public.edhrec_card_commander_recs"') ||
    message.includes("relation 'public.deck_card_commander_matches'") ||
    message.includes('relation "public.deck_card_commander_matches"')
  )
}

function buildRefreshRedirect(
  returnTo: string,
  counts: {
    cardRowsProcessed: number
    matchedCount: number
    noMatchCount: number
    errorCount: number
  }
) {
  const [pathname, rawSearch = ''] = returnTo.split('?')
  const params = new URLSearchParams(rawSearch)

  params.set('commanderFitsRefreshed', '1')
  params.set('fitRows', String(counts.cardRowsProcessed))
  params.set('fitMatched', String(counts.matchedCount))
  params.set('fitNoMatch', String(counts.noMatchCount))
  params.set('fitErrors', String(counts.errorCount))

  const nextSearch = params.toString()
  return nextSearch ? `${pathname}?${nextSearch}` : pathname
}

function buildRefreshErrorRedirect(returnTo: string, message: string) {
  const [pathname, rawSearch = ''] = returnTo.split('?')
  const params = new URLSearchParams(rawSearch)
  params.set('commanderFitsError', message)
  const nextSearch = params.toString()
  return nextSearch ? `${pathname}?${nextSearch}` : pathname
}

export async function refreshCommanderFitsAction(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const returnTo = String(formData.get('return_to') || '/my-decks').trim() || '/my-decks'
  const force = formData.get('force') === '1'
  try {
    const result = await refreshCommanderFitsForUser(user.id, { force })
    redirect(buildRefreshRedirect(returnTo, result))
  } catch (error) {
    if (isRedirectError(error)) {
      throw error
    }

    const message =
      error instanceof Error ? error.message : 'Commander fit refresh failed.'

    if (
      message.includes('SUPABASE_SERVICE_ROLE_KEY') ||
      message.includes('Supabase admin access is not configured')
    ) {
      redirect(
        buildRefreshErrorRedirect(
          returnTo,
          'Commander fits need server admin credentials before refresh can run.'
        )
      )
    }

    if (isCommanderFitsSchemaMissing(message)) {
      redirect(
        buildRefreshErrorRedirect(
          returnTo,
          'Commander fits tables are not in Supabase yet. Run the latest migration first.'
        )
      )
    }

    redirect(buildRefreshErrorRedirect(returnTo, message.slice(0, 180)))
  }
}
