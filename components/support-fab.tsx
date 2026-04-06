'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LifeBuoy } from 'lucide-react'

export function SupportFab() {
  const pathname = usePathname()

  if (pathname === '/support') {
    return null
  }

  return (
    <Link
      href="/support"
      className="fixed bottom-5 right-5 z-[105] inline-flex items-center gap-3 rounded-full border border-sky-300/25 bg-[linear-gradient(135deg,rgba(56,189,248,0.18),rgba(16,185,129,0.16))] px-4 py-3 text-sm font-medium text-white shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:scale-[1.01] hover:border-sky-200/40 hover:bg-[linear-gradient(135deg,rgba(56,189,248,0.24),rgba(16,185,129,0.22))]"
      aria-label="Open support"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/12">
        <LifeBuoy className="h-4 w-4" />
      </span>
      <span className="hidden sm:inline">Support</span>
    </Link>
  )
}
