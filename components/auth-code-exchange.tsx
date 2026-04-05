'use client'

import { createClient } from '@/lib/supabase/client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function AuthCodeExchange() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'idle' | 'working' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const codeParam = searchParams.get('code')?.trim()

    if (!codeParam) return

    const code = codeParam

    let cancelled = false

    async function exchangeCode() {
      setStatus('working')
      setError(null)

      const supabase = createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (cancelled) return

      if (error) {
        setStatus('error')
        setError(error.message)
        return
      }

      const nextParams = new URLSearchParams(searchParams.toString())
      nextParams.delete('code')
      nextParams.delete('type')
      nextParams.delete('error')
      nextParams.delete('error_code')
      nextParams.delete('error_description')
      nextParams.set('verified', '1')

      const nextUrl = `${pathname}${nextParams.size > 0 ? `?${nextParams.toString()}` : ''}`

      router.replace(nextUrl)
      router.refresh()
    }

    exchangeCode()

    return () => {
      cancelled = true
    }
  }, [pathname, router, searchParams])

  if (status === 'working') {
    return (
      <div className="mx-auto mb-6 max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          Verifying your email and finishing sign-in...
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="mx-auto mb-6 max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          We could not verify that email link automatically.
          {error ? ` ${error}` : ''}
        </div>
      </div>
    )
  }

  if (searchParams.get('verified') === '1') {
    return (
      <div className="mx-auto mb-6 max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          Email confirmed. Your account is now ready to use.
        </div>
      </div>
    )
  }

  return null
}
