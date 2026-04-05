'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import SignOutButton from '@/components/sign-out-button'

export function HeaderAuth() {
  const [isSignedIn, setIsSignedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let active = true

    supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setIsSignedIn(!!data.user)
      }
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setIsSignedIn(!!session?.user)
      }
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  if (isSignedIn) {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          className="border border-emerald-400/20 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15 hover:text-emerald-100"
          asChild
        >
          <Link href="/settings/profile">
            <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.75)]" />
            Signed In
          </Link>
        </Button>
        <SignOutButton />
      </>
    )
  }

  return (
    <Button variant="ghost" size="sm" asChild>
      <Link href="/sign-in">Sign In</Link>
    </Button>
  )
}
