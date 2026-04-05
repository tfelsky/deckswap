'use client'

import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import Link from 'next/link'
import { useEffect, useState } from 'react'

type AnalyticsConsent = 'accepted' | 'declined' | 'unknown'

const CONSENT_STORAGE_KEY = 'deckswap_analytics_consent'
const CONSENT_COOKIE_NAME = 'deckswap_analytics_consent'
const CONSENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 180

function readStoredConsent(): AnalyticsConsent {
  if (typeof window === 'undefined') return 'unknown'

  const storedConsent = window.localStorage.getItem(CONSENT_STORAGE_KEY)
  if (storedConsent === 'accepted' || storedConsent === 'declined') {
    return storedConsent
  }

  const cookieMatch = document.cookie.match(
    new RegExp(`(?:^|; )${CONSENT_COOKIE_NAME}=([^;]*)`)
  )
  const cookieValue = cookieMatch?.[1]

  if (cookieValue === 'accepted' || cookieValue === 'declined') {
    return cookieValue
  }

  return 'unknown'
}

function persistConsent(nextConsent: Exclude<AnalyticsConsent, 'unknown'>) {
  window.localStorage.setItem(CONSENT_STORAGE_KEY, nextConsent)

  const secureFlag = window.location.protocol === 'https:' ? '; secure' : ''
  document.cookie =
    `${CONSENT_COOKIE_NAME}=${nextConsent}; path=/; max-age=${CONSENT_COOKIE_MAX_AGE}; samesite=lax${secureFlag}`
}

export function AnalyticsConsentGate() {
  const [consent, setConsent] = useState<AnalyticsConsent>('unknown')
  const [preferencesOpen, setPreferencesOpen] = useState(false)

  useEffect(() => {
    setConsent(readStoredConsent())
  }, [])

  function updateConsent(nextConsent: Exclude<AnalyticsConsent, 'unknown'>) {
    persistConsent(nextConsent)
    setConsent(nextConsent)
    setPreferencesOpen(false)
  }

  const shouldLoadAnalytics = consent === 'accepted'
  const shouldShowBanner = consent === 'unknown'

  return (
    <>
      {shouldLoadAnalytics ? (
        <>
          <Analytics />
          <SpeedInsights />
        </>
      ) : null}

      {shouldShowBanner ? (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-zinc-950/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 text-sm text-zinc-200 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <p className="font-medium text-white">Privacy choices</p>
              <p className="mt-1 text-zinc-400">
                DeckSwap uses essential cookies for sign-in and can use optional analytics to
                understand product performance. Analytics stays off unless you opt in. See{' '}
                <Link href="/privacy" className="text-emerald-300 underline underline-offset-4">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => updateConsent('declined')}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white hover:bg-white/10"
              >
                Keep analytics off
              </button>
              <button
                type="button"
                onClick={() => updateConsent('accepted')}
                className="rounded-2xl bg-emerald-400 px-4 py-2 font-medium text-zinc-950 hover:opacity-90"
              >
                Allow analytics
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="fixed bottom-4 right-4 z-40">
        {preferencesOpen ? (
          <div className="w-[min(22rem,calc(100vw-2rem))] rounded-3xl border border-white/10 bg-zinc-900 p-4 text-sm text-zinc-200 shadow-2xl">
            <p className="font-medium text-white">Analytics preferences</p>
            <p className="mt-2 text-zinc-400">
              Essential cookies remain on for authentication. Optional analytics help measure
              traffic and performance.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => updateConsent('declined')}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white hover:bg-white/10"
              >
                Turn off analytics
              </button>
              <button
                type="button"
                onClick={() => updateConsent('accepted')}
                className="rounded-2xl bg-emerald-400 px-4 py-2 font-medium text-zinc-950 hover:opacity-90"
              >
                Turn on analytics
              </button>
            </div>

            <button
              type="button"
              onClick={() => setPreferencesOpen(false)}
              className="mt-3 text-xs text-zinc-500 hover:text-zinc-300"
            >
              Close
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPreferencesOpen(true)}
            className="rounded-full border border-white/10 bg-zinc-900/90 px-4 py-2 text-xs font-medium text-zinc-200 shadow-lg backdrop-blur hover:bg-zinc-800"
          >
            Privacy choices
          </button>
        )}
      </div>
    </>
  )
}
