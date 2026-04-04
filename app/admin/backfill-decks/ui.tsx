'use client'

import { useState } from 'react'
import {
  backfillDeckCommanderImages,
  prepareReEnrichDeckQueue,
  reEnrichAllDecks,
  reEnrichDeckBatch,
} from './actions'

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
  const [reEnrichTotal, setReEnrichTotal] = useState(0)
  const [reEnrichProcessed, setReEnrichProcessed] = useState(0)
  const [reEnrichUpdated, setReEnrichUpdated] = useState(0)
  const [reEnrichSkipped, setReEnrichSkipped] = useState(0)
  const [reEnrichLogs, setReEnrichLogs] = useState<string[]>([])

  async function runReEnrichWithProgress() {
    setLoadingAction('re-enrich')
    setResult(null)
    setResultLabel(null)
    setReEnrichLogs([])
    setReEnrichProcessed(0)
    setReEnrichUpdated(0)
    setReEnrichSkipped(0)

    try {
      const queue = await prepareReEnrichDeckQueue()
      setReEnrichTotal(queue.total)
      setReEnrichLogs([
        `Seeking ${queue.total} deck record${queue.total === 1 ? '' : 's'} for re-enrichment...`,
      ])

      const batchSize = 8
      let updated = 0
      let skipped = 0
      let processed = 0
      const errors: string[] = []

      for (let index = 0; index < queue.deckIds.length; index += batchSize) {
        const batchIds = queue.deckIds.slice(index, index + batchSize)
        const batch = await reEnrichDeckBatch(batchIds)

        processed += batch.processed
        updated += batch.updated
        skipped += batch.skipped
        errors.push(...batch.errors)

        setReEnrichProcessed(processed)
        setReEnrichUpdated(updated)
        setReEnrichSkipped(skipped)
        setReEnrichLogs((current) => [...current, ...batch.logs])
      }

      setResult({
        updated,
        skipped,
        errors,
      })
      setResultLabel('Deck re-enrichment completed')
      setReEnrichLogs((current) => [
        ...current,
        `Finished re-enriching ${processed} of ${queue.total} deck record${
          queue.total === 1 ? '' : 's'
        }.`,
      ])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setResult({
        updated: 0,
        skipped: 0,
        errors: [message],
      })
      setResultLabel('Deck re-enrichment failed')
      setReEnrichLogs((current) => [...current, `Run failed: ${message}`])
    } finally {
      setLoadingAction(null)
    }
  }

  async function runAction(
    action: 'commander-backfill' | 're-enrich'
  ) {
    if (action === 're-enrich') {
      await runReEnrichWithProgress()
      return
    }

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

  const progressPercent =
    reEnrichTotal > 0 ? Math.min(100, Math.round((reEnrichProcessed / reEnrichTotal) * 100)) : 0

  return (
    <main className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-zinc-900 p-8">
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

        {(loadingAction === 're-enrich' || reEnrichLogs.length > 0) && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-white">Re-enrichment Progress</div>
                <div className="mt-2 text-sm text-zinc-400">
                  {reEnrichTotal > 0
                    ? `${reEnrichProcessed} of ${reEnrichTotal} deck records processed`
                    : 'Preparing deck queue...'}
                </div>
              </div>
              <div className="grid gap-2 text-right text-sm text-zinc-300 sm:grid-cols-3 sm:text-left">
                <div>
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Updated</div>
                  <div className="mt-1 text-lg font-semibold text-emerald-300">{reEnrichUpdated}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Skipped</div>
                  <div className="mt-1 text-lg font-semibold text-amber-200">{reEnrichSkipped}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Progress</div>
                  <div className="mt-1 text-lg font-semibold text-white">{progressPercent}%</div>
                </div>
              </div>
            </div>

            <div className="mt-4 h-4 overflow-hidden rounded-full border border-white/10 bg-zinc-950">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-300 to-emerald-200 transition-[width] duration-500 ease-out motion-safe:animate-pulse"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
              <div className="mb-3 text-sm font-medium text-white">Run Log</div>
              <div className="max-h-80 space-y-2 overflow-y-auto font-mono text-xs text-zinc-300">
                {reEnrichLogs.length > 0 ? (
                  reEnrichLogs.map((line, index) => (
                    <div key={`${index}-${line}`}>{line}</div>
                  ))
                ) : (
                  <div className="text-zinc-500">No log entries yet.</div>
                )}
              </div>
            </div>
          </div>
        )}

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
