'use client'

import { useEffect } from 'react'

const SINGLES_CART_STORAGE_KEY = 'deckswap_singles_cart_v1'

export function SinglesCartResetter({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return

    window.localStorage.removeItem(SINGLES_CART_STORAGE_KEY)
  }, [enabled])

  return null
}
