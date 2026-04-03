'use client'

import { clearGuestImportDraft } from '@/lib/guest-import'
import { useEffect } from 'react'

export default function GuestDraftCleanup({
  shouldClear,
}: {
  shouldClear: boolean
}) {
  useEffect(() => {
    if (!shouldClear) return

    clearGuestImportDraft()
  }, [shouldClear])

  return null
}
