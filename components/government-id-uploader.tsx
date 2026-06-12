'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

export default function GovernmentIdUploader({
  hasDocument,
}: {
  hasDocument: boolean
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      setError('Choose a JPEG, PNG, WebP, or PDF document first.')
      return
    }

    setPending(true)
    setError(null)
    setNotice(null)

    try {
      const formData = new FormData()
      formData.set('document', file)

      const response = await fetch('/api/profile/government-id', {
        method: 'POST',
        body: formData,
      })
      const payload = (await response.json()) as { error?: string }

      if (!response.ok) {
        setError(payload.error ?? 'Upload failed. Try again in a moment.')
        return
      }

      setNotice('ID document uploaded securely. Only the review team can open it.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      router.refresh()
    } catch {
      setError('Upload failed. Check your connection and try again.')
    } finally {
      setPending(false)
    }
  }

  async function handleRemove() {
    setPending(true)
    setError(null)
    setNotice(null)

    try {
      const response = await fetch('/api/profile/government-id', { method: 'DELETE' })
      const payload = (await response.json()) as { error?: string }

      if (!response.ok) {
        setError(payload.error ?? 'Could not remove the document. Try again in a moment.')
        return
      }

      setNotice('ID document removed.')
      router.refresh()
    } catch {
      setError('Could not remove the document. Check your connection and try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-medium text-white">Government ID document</div>
        <span
          className={`rounded-full border px-3 py-1 text-xs ${
            hasDocument
              ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
              : 'border-white/10 bg-white/5 text-zinc-400'
          }`}
        >
          {hasDocument ? 'Document on file' : 'No document uploaded'}
        </span>
      </div>

      <p className="mt-3 text-sm text-zinc-400">
        Upload a government-issued ID for higher-trust review on larger deals. The file is stored
        in a private bucket and is only viewable by the verification review team through
        short-lived secure links.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="block w-full rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300 file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-400 file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-950 hover:file:opacity-90"
        />
        <button
          type="button"
          onClick={handleUpload}
          disabled={pending}
          className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? 'Working…' : hasDocument ? 'Replace document' : 'Upload document'}
        </button>
        {hasDocument && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={pending}
            className="rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-3 text-sm font-medium text-red-200 hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Remove
          </button>
        )}
      </div>

      <p className="mt-2 text-xs text-zinc-500">JPEG, PNG, WebP, or PDF up to 5 MB.</p>

      {error && (
        <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {notice && (
        <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          {notice}
        </div>
      )}
    </div>
  )
}
