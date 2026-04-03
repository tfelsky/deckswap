'use client'

import { hasGuestImportDraft } from '@/lib/guest-import'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignInPage() {
  const supabase = createClient()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [guestDraftToken, setGuestDraftToken] = useState('')

  useEffect(() => {
    setGuestDraftToken(new URLSearchParams(window.location.search).get('guestDraft')?.trim() ?? '')
  }, [])

  function getPostAuthRoute() {
    if (hasGuestImportDraft() || guestDraftToken) {
      return guestDraftToken
        ? `/import-deck?fromGuest=1&guestDraft=${encodeURIComponent(guestDraftToken)}`
        : '/import-deck?fromGuest=1'
    }

    return '/decks'
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (mode === 'sign-in') {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      router.push(getPostAuthRoute())
      router.refresh()
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (getPostAuthRoute() !== '/decks') {
      setMessage(
        'Account created. If email confirmation is enabled, confirm your email and then sign in here to carry your guest preview into the save flow.'
      )
      setLoading(false)
      return
    }

    setMessage(
      'Account created. If email confirmation is enabled in Supabase, check your inbox before signing in.'
    )
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/decks"
              className="inline-block rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10"
            >
              {'<-'} Back to decks
            </Link>

            <Link
              href={
                guestDraftToken
                  ? `/guest-import?guestDraft=${encodeURIComponent(guestDraftToken)}`
                  : '/guest-import'
              }
              className="inline-block rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
            >
              Try guest import
            </Link>
          </div>

          <div className="mt-8">
            <div className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-300">
              Account Access
            </div>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight">
              {mode === 'sign-in' ? 'Sign in' : 'Create account'}
            </h1>

            <p className="mt-3 max-w-2xl text-zinc-400">
              Use email and password authentication through Supabase. Want to see the product first? Try a guest import preview and save later.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6 sm:p-8">
          <div className="mb-6 flex gap-3">
            <button
              type="button"
              onClick={() => {
                setMode('sign-in')
                setError(null)
                setMessage(null)
              }}
              className={`rounded-2xl px-4 py-2 text-sm font-medium ${
                mode === 'sign-in'
                  ? 'bg-emerald-400 text-zinc-950'
                  : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
              }`}
            >
              Sign in
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('sign-up')
                setError(null)
                setMessage(null)
              }}
              className={`rounded-2xl px-4 py-2 text-sm font-medium ${
                mode === 'sign-up'
                  ? 'bg-emerald-400 text-zinc-950'
                  : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
              }`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-emerald-400/40"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-emerald-400/40"
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? mode === 'sign-in'
                  ? 'Signing in...'
                  : 'Creating account...'
                : mode === 'sign-in'
                ? 'Sign in'
                : 'Create account'}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
