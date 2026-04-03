'use client'

import { GUEST_IMPORT_DRAFT_KEY } from '@/lib/guest-import'
import { useEffect } from 'react'

export default function GuestDraftCleanup({
  shouldClear,
}: {
  shouldClear: boolean
}) {
  useEffect(() => {
    if (!shouldClear) return

    window.sessionStorage.removeItem(GUEST_IMPORT_DRAFT_KEY)
  }, [shouldClear])

  return null
}
