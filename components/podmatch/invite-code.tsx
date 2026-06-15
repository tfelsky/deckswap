'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export default function InviteCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  function copyLink() {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const link = `${origin}/podmatch/leagues/join?code=${encodeURIComponent(code)}`
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <code className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-1.5 text-sm font-mono tracking-wider text-white">
        {code}
      </code>
      <button
        type="button"
        onClick={copyLink}
        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium hover:bg-white/10"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
        {copied ? 'Copied' : 'Copy join link'}
      </button>
    </div>
  )
}
