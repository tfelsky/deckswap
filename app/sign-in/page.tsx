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
  const [nextDeckIdea, setNextDeckIdea] = useState('')
  const [commanderSuggestions, setCommanderSuggestions] = useState<string[]>([])
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [guestDraftToken, setGuestDraftToken] = useState('')
  const [nextPath, setNextPath] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setGuestDraftToken(params.get('guestDraft')?.trim() ?? '')
    setNextPath(params.get('next')?.trim() ?? '')
  }, [])

  useEffect(() => {
    if (mode !== 'sign-up') {
      setCommanderSuggestions([])
      return
    }

    const query = nextDeckIdea.trim()

    if (query.length < 2) {
      setCommanderSuggestions([])
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/commanders/suggest?q=${encodeURIComponent(query)}`,
          {
            signal: controller.signal,
          }
        )
        const payload = (await response.json()) as {
          suggestions?: string[]
        }
        setCommanderSuggestions(payload.suggestions ?? [])
      } catch (fetchError) {
        if ((fetchError as Error).name !== 'AbortError') {
          setCommanderSuggestions([])
        }
      }
    }, 180)

    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [mode, nextDeckIdea])

  function getPostAuthRoute() {
    if (hasGuestImportDraft() || guestDraftToken) {
      return guestDraftToken
        ? `/import-deck?fromGuest=1&guestDraft=${encodeURIComponent(guestDraftToken)}`
        : '/import-deck?fromGuest=1'
    }

    if (nextPath.startsWith('/')) {
      return nextPath
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

    const surveyAnswer = nextDeckIdea.trim()

    if (!surveyAnswer) {
      setError('Tell us which legendary creature you want to build next.')
      setLoading(false)
      return
    }

    const commanderResolutionResponse = await fetch('/api/commanders/resolve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: surveyAnswer,
      }),
    })

    const commanderResolution = (await commanderResolutionResponse.json()) as {
      commanderName?: string
      corrected?: boolean
      error?: string
    }

    if (!commanderResolutionResponse.ok || !commanderResolution.commanderName) {
      setError(
        commanderResolution.error ||
          'We could not match that answer to a known legendary creature.'
      )
      setLoading(false)
      return
    }

    const normalizedCommanderName = commanderResolution.commanderName

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          next_deck_commander: normalizedCommanderName,
          next_deck_commander_input: surveyAnswer,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    try {
      const notificationResponse = await fetch('/api/admin/new-user-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          userId: data.user?.id ?? null,
          nextDeckCommander: normalizedCommanderName,
        }),
      })

      if (!notificationResponse.ok) {
        const payload = (await notificationResponse.json().catch(() => null)) as
          | { error?: string }
          | null

        console.error('Failed to trigger new-user admin email:', {
          status: notificationResponse.status,
          error: payload?.error ?? 'Unknown error',
        })
      }
    } catch (notificationError) {
      console.error('Failed to trigger new-user admin email:', notificationError)
    }

    if (getPostAuthRoute() !== '/decks') {
      setMessage(
        `Account created. We saved your next deck idea as ${normalizedCommanderName}. If email confirmation is enabled, confirm your email and then sign in here to carry your guest preview into the save flow.`
      )
      setLoading(false)
      return
    }

    setMessage(
      `Account created. We saved your next deck idea as ${normalizedCommanderName}. If email confirmation is enabled in Supabase, check your inbox before signing in.`
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

            {mode === 'sign-up' && (
              <div>
                <label
                  htmlFor="next-deck-idea"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  The next deck I want to build is
                </label>
                <input
                  id="next-deck-idea"
                  type="text"
                  list="commander-suggestions"
                  required={mode === 'sign-up'}
                  value={nextDeckIdea}
                  onChange={(e) => setNextDeckIdea(e.target.value)}
                  placeholder="Atraxa, Praetors' Voice"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-emerald-400/40"
                />
                <datalist id="commander-suggestions">
                  {commanderSuggestions.map((suggestion) => (
                    <option key={suggestion} value={suggestion} />
                  ))}
                </datalist>
                <p className="mt-2 text-xs text-zinc-500">
                  Short answer. We will suggest names from the commander directory and still correct spelling on submit.
                </p>
              </div>
            )}

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
