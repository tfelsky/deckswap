import { createClient } from '@/lib/supabase/server'
import { getAdminAccessForUser } from '@/lib/admin/access'
import { redirect } from 'next/navigation'
import BackfillDecksClient from './ui'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const access = await getAdminAccessForUser(user)

  if (!access.isSuperadmin) {
    redirect('/decks')
  }

  return <BackfillDecksClient />
}
