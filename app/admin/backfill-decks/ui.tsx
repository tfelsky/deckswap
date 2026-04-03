'use client'

import { useState } from 'react'
import { backfillDeckCommanderImages } from './actions'

type Result = {
  updated: number
  skipped: number
  errors: string[]
} | null

export default function BackfillDecksClient() {
  const [result, setResult] = useState<Result>(null)
  const [loading, setLoading] = useState(false)

  async function handleRun() {
    setLoading(true)
    try {
      const res = await backfillDeckCommanderImages()
      setResult(res)
    } catch (error) {
      setResult({
        updated: 0,
        skipped: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-zinc-900 p-8">
        <h1 className="text-3xl font-semibold">Backfill Deck Commander Data</h1>
        <p className="mt-3 text-zinc-400">
          Populate missing commander names and deck images from saved commander cards.
        </p>

        <button
          onClick={handleRun}
          disabled={loading}
          className="mt-6 rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90 disabled:opacity-60"
        >
          {loading ? 'Running…' : 'Run Backfill'}
        </button>

        {result && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
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