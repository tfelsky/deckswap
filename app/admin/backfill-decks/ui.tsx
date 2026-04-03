'use client'

import { useState } from 'react'
import { backfillDeckCommanderImages, reEnrichAllDecks } from './actions'

type Result = {
  updated: number
  skipped: number
  errors: string[]
} | null

export default function BackfillDecksClient() {
  const [result, setResult] = useState<Result>(null)
  const [loadingAction, setLoadingAction] = useState<
    'commander-backfill' | 're-enrich' | null
  >(null)
  const [resultLabel, setResultLabel] = useState<string | null>(null)

  async function runAction(
    action: 'commander-backfill' | 're-enrich'
  ) {
    setLoadingAction(action)
    try {
      const res =
        action === 'commander-backfill'
          ? await backfillDeckCommanderImages()
          : await reEnrichAllDecks()
      setResult(res)
      setResultLabel(
        action === 'commander-backfill'
          ? 'Commander/image backfill completed'
          : 'Deck re-enrichment completed'
      )
    } catch (error) {
      setResult({
        updated: 0,
        skipped: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      })
      setResultLabel(
        action === 'commander-backfill'
          ? 'Commander/image backfill failed'
          : 'Deck re-enrichment failed'
      )
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-zinc-900 p-8">
        <h1 className="text-3xl font-semibold">Backfill Deck Commander Data</h1>
        <p className="mt-3 text-zinc-400">
          Run admin maintenance tasks for commander images and full Scryfall pricing refreshes.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <button
            onClick={() => runAction('commander-backfill')}
            disabled={loadingAction !== null}
            className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90 disabled:opacity-60"
          >
            {loadingAction === 'commander-backfill'
              ? 'Running...'
              : 'Backfill Commander Data'}
          </button>

          <button
            onClick={() => runAction('re-enrich')}
            disabled={loadingAction !== null}
            className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-60"
          >
            {loadingAction === 're-enrich'
              ? 'Re-enriching...'
              : 'Re-enrich All Decks'}
          </button>
        </div>

        {result && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
            {resultLabel && (
              <div className="mb-4 font-medium text-emerald-300">{resultLabel}</div>
            )}
            <div>Updated: {result.updated}</div>
            <div>Skipped: {result.skipped}</div>

            {result.errors.length > 0 && (
              <div className="mt-4">
                <div className="font-medium text-red-300">Errors</div>
                <ul className="mt-2 list-disc pl-5 text-sm text-zinc-300">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
