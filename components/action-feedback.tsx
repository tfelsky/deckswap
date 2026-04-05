'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const BUTTON_SELECTOR = "button, input[type='submit'], input[type='button'], [role='button']"

function isModifiedEvent(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
}

export function ActionFeedback() {
  const pathname = usePathname()
  const [isWorking, setIsWorking] = useState(false)
  const resetTimerRef = useRef<number | null>(null)

  useEffect(() => {
    setIsWorking(false)
    if (resetTimerRef.current) {
      window.clearTimeout(resetTimerRef.current)
      resetTimerRef.current = null
    }
  }, [pathname])

  useEffect(() => {
    const pulseElement = (element: Element | null) => {
      if (!(element instanceof HTMLElement)) return

      element.dataset.pressed = 'true'
      window.setTimeout(() => {
        delete element.dataset.pressed
      }, 220)
    }

    const beginWorking = () => {
      setIsWorking(true)
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current)
      }
      resetTimerRef.current = window.setTimeout(() => {
        setIsWorking(false)
        resetTimerRef.current = null
      }, 8000)
    }

    const handlePointerDown = (event: PointerEvent) => {
      pulseElement((event.target as Element | null)?.closest(BUTTON_SELECTOR) ?? null)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      pulseElement((event.target as Element | null)?.closest(BUTTON_SELECTOR) ?? null)
    }

    const handleSubmit = () => {
      beginWorking()
    }

    const handleClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest('a[href]') as HTMLAnchorElement | null
      if (!link || isModifiedEvent(event)) return

      const href = link.getAttribute('href')
      const target = link.getAttribute('target')
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return
      if (target && target !== '_self') return

      const url = new URL(link.href, window.location.href)
      if (url.origin !== window.location.origin) return

      beginWorking()
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('submit', handleSubmit, true)
    document.addEventListener('click', handleClick, true)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('submit', handleSubmit, true)
      document.removeEventListener('click', handleClick, true)
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current)
      }
    }
  }, [])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[110] h-1 overflow-hidden"
    >
      <div
        className={[
          'h-full w-full origin-left bg-gradient-to-r from-emerald-300 via-cyan-300 to-amber-200 shadow-[0_0_24px_rgba(110,231,183,0.65)] transition-all duration-300',
          isWorking ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0',
        ].join(' ')}
      />
    </div>
  )
}
