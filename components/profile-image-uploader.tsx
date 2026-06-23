'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import type { ProfileImageKind } from '@/lib/profiles/profile-images'

export default function ProfileImageUploader({
  kind,
  label,
  hint,
  currentUrl,
}: {
  kind: ProfileImageKind
  label: string
  hint: string
  currentUrl?: string | null
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(currentUrl?.trim() || null)

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      setError('Choose a JPEG, PNG, or WebP image first.')
      return
    }

    setPending(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.set('file', file)
      formData.set('kind', kind)

      const response = await fetch('/api/profile/image', { method: 'POST', body: formData })
      const payload = (await response.json()) as { url?: string; error?: string }

      if (!response.ok || !payload.url) {
        setError(payload.error ?? 'Upload failed. Try again in a moment.')
        return
      }

      setPreview(payload.url)
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

    try {
      const response = await fetch(`/api/profile/image?kind=${kind}`, { method: 'DELETE' })
      const payload = (await response.json()) as { error?: string }

      if (!response.ok) {
        setError(payload.error ?? 'Could not remove the image. Try again in a moment.')
        return
      }

      setPreview(null)
      router.refresh()
    } catch {
      setError('Could not remove the image. Check your connection and try again.')
    } finally {
      setPending(false)
    }
  }

  const isBanner = kind === 'banner'

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-white">{label}</div>
        <span
          className={`rounded-full border px-3 py-1 text-xs ${
            preview
              ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
              : 'border-white/10 bg-white/5 text-zinc-400'
          }`}
        >
          {preview ? 'Image set' : 'No image'}
        </span>
      </div>

      <p className="mt-2 text-xs text-zinc-500">{hint}</p>

      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt={`${label} preview`}
          className={
            isBanner
              ? 'mt-3 h-24 w-full rounded-xl border border-white/10 object-cover'
              : 'mt-3 h-20 w-20 rounded-xl border border-white/10 object-cover'
          }
        />
      ) : null}

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="block w-full rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300 file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-400 file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-950 hover:file:opacity-90"
        />
        <button
          type="button"
          onClick={handleUpload}
          disabled={pending}
          className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? 'Working…' : preview ? 'Replace' : 'Upload'}
        </button>
        {preview ? (
          <button
            type="button"
            onClick={handleRemove}
            disabled={pending}
            className="rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-3 text-sm font-medium text-red-200 hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Remove
          </button>
        ) : null}
      </div>

      <p className="mt-2 text-xs text-zinc-500">JPEG, PNG, or WebP up to 5 MB.</p>

      {error ? (
        <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}
    </div>
  )
}
