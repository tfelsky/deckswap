'use server'

import { refreshCommanderFitsForUser } from '@/lib/edhrec/commander-fits'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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

  const result = await refreshCommanderFitsForUser(user.id, { force })
  redirect(buildRefreshRedirect(returnTo, result))
}
