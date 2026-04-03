import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BackfillDecksClient from './ui'

const ADMIN_EMAIL = 'tim.felsky@gmail.com'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  if (user.email !== ADMIN_EMAIL) {
    redirect('/decks')
  }

  return <BackfillDecksClient />
}
