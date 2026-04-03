'use client'

import { GUEST_IMPORT_DRAFT_KEY, type GuestImportDraft } from '@/lib/guest-import'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function GuestImportPage() {
  const router = useRouter()
  const [deckName, setDeckName] = useState('')
  const [sourceType, setSourceType] = useState('text')
  const [sourceUrl, setSourceUrl] = useState('')
  const [rawList, setRawList] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const text = await file.text()
    setRawList(text.trim())

    if (!deckName) {
      setDeckName(file.name.replace(/\.[^.]+$/, '').trim())
    }
  }

  function handlePreview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const draft: GuestImportDraft = {
      deckName: deckName.trim(),
      sourceType: sourceType.trim(),
      sourceUrl: sourceUrl.trim(),
      rawList: rawList.trim(),
    }

    if (!draft.rawList && draft.sourceType !== 'moxfield') {
      setError('Paste a deck list or upload a file to preview it.')
      return
    }

    if (draft.sourceType === 'moxfield' && !draft.sourceUrl) {
      setError('Add a Moxfield URL to preview that deck source.')
      return
    }

    window.sessionStorage.setItem(GUEST_IMPORT_DRAFT_KEY, JSON.stringify(draft))
    router.push('/guest-preview')
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/sign-in"
              className="inline-block rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10"
            >
              {'<-'} Back to sign in
            </Link>
            <Link
              href="/import-deck"
              className="inline-block rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
            >
              Authenticated import
            </Link>
          </div>

          <div className="mt-8 max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-300">
              Guest Import Preview
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">
              Try the import flow before creating an account
            </h1>
            <p className="mt-3 text-zinc-400">
              Preview parsing, format detection, validation, and deck structure in a temporary
              guest sandbox. Sign in later to carry this list into the real save flow.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-10">
        <form
          onSubmit={handlePreview}
          className="rounded-3xl border border-white/10 bg-zinc-900 p-6 sm:p-8"
        >
          <div className="grid gap-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">Deck name</label>
              <input
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                placeholder="Optional for preview"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-emerald-400/40"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">Source type</label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-400/40"
                >
                  <option value="text" className="bg-zinc-900 text-white">Text</option>
                  <option value="archidekt" className="bg-zinc-900 text-white">Archidekt</option>
                  <option value="moxfield" className="bg-zinc-900 text-white">Moxfield URL</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Source URL (optional)
                </label>
                <input
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://moxfield.com/decks/..."
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-emerald-400/40"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Deck file (optional)
              </label>
              <input
                type="file"
                accept=".txt,.csv,.tsv"
                onChange={handleFileChange}
                className="block w-full rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300 file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-400 file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-950 hover:file:opacity-90"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">Raw deck list</label>
              <textarea
                value={rawList}
                onChange={(e) => setRawList(e.target.value)}
                rows={18}
                placeholder={`Commander
1 Alela, Artful Provocateur

Mainboard
1 Sol Ring
1 Arcane Signet
...
1 Island`}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-emerald-400/40"
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90"
            >
              Preview as guest
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
