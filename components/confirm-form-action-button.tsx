'use client'

import { useFormStatus } from 'react-dom'
import { LoaderCircle } from 'lucide-react'

type ConfirmFormActionButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode
  confirmMessage: string
  pendingLabel?: string
}

export default function ConfirmFormActionButton({
  children,
  confirmMessage,
  pendingLabel = 'Working...',
  className,
  onClick,
  ...props
}: ConfirmFormActionButtonProps) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      data-interactive-feedback="true"
      onClick={(event) => {
        if (pending) return
        if (!window.confirm(confirmMessage)) {
          event.preventDefault()
          return
        }
        onClick?.(event)
      }}
      className={className}
      {...props}
    >
      <span className="inline-flex items-center justify-center gap-2">
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
        <span>{pending ? pendingLabel : children}</span>
      </span>
    </button>
  )
}
