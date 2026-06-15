'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { scoreDeckAction, type ScoreDeckActionState } from '@/app/podmatch/actions'
import FormActionButton from '@/components/form-action-button'

type ScoreDeckFormProps = {
  deckId: number
  label?: string
  pendingLabel?: string
  className?: string
  /** Refresh the route on success so freshly-computed scores render. */
  refreshOnSuccess?: boolean
}

export default function ScoreDeckForm({
  deckId,
  label = 'Score deck',
  pendingLabel = 'Scoring…',
  className,
  refreshOnSuccess = true,
}: ScoreDeckFormProps) {
  const router = useRouter()
  const [state, action] = useActionState<ScoreDeckActionState, FormData>(
    scoreDeckAction,
    {}
  )

  useEffect(() => {
    if (state.ok && refreshOnSuccess) {
      router.refresh()
    }
  }, [state.ok, refreshOnSuccess, router])

  return (
    <form action={action} className="inline-flex flex-col gap-2">
      <input type="hidden" name="deckId" value={deckId} />
      <FormActionButton
        pendingLabel={pendingLabel}
        className={
          className ??
          'rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90'
        }
      >
        {label}
      </FormActionButton>
      {state.error ? (
        <p className="max-w-xs text-sm text-red-400">{state.error}</p>
      ) : null}
    </form>
  )
}
