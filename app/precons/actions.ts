'use server'

import { importNormalizedDeckToCollection } from '@/lib/deck-imports'
import { getPreconDeck } from '@/lib/precons/catalog'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

function buildErrorRedirect(fileName: string | null, message: string) {
  const params = new URLSearchParams()
  params.set('error', message)
  if (fileName) {
    params.set('selected', fileName)
  }

  return `/precons?${params.toString()}`
}

export async function importPreconAction(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in?next=/precons')
  }

  const fileName = String(formData.get('file_name') || '').trim()
  const inventoryMode = String(formData.get('inventory_mode') || 'complete').trim().toLowerCase()
  const selectedDeck = await getPreconDeck(fileName)

  if (!selectedDeck) {
    redirect(buildErrorRedirect(fileName || null, 'That precon could not be found in the MTGJSON catalog.'))
  }

  const importResult = await importNormalizedDeckToCollection({
    supabase,
    userId: user.id,
    actorUserId: user.id,
    deckName: selectedDeck.name,
    sourceType: 'mtgjson_precon',
    sourceUrl: selectedDeck.deckUrl,
    parsedCards: selectedDeck.cards,
    initialIsSealed: inventoryMode === 'sealed',
    initialIsCompletePrecon: true,
  })

  const params = new URLSearchParams()
  params.set('imported', '1')
  params.set('tab', 'settings')
  params.set('catalog', 'precon')
  params.set('mode', inventoryMode === 'sealed' ? 'sealed' : 'complete')

  if (importResult.enrichFailed) {
    params.set('enrich', 'failed')
  }

  redirect(`/my-decks/${importResult.deckId}?${params.toString()}`)
}
