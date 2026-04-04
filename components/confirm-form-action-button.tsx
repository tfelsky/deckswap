'use client'

import { useFormStatus } from 'react-dom'

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
      {pending ? pendingLabel : children}
    </button>
  )
}
