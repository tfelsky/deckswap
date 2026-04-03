'use client'

import { useFormStatus } from 'react-dom'

type FormActionButtonProps = {
  children: React.ReactNode
  pendingLabel?: string
  className?: string
}

export default function FormActionButton({
  children,
  pendingLabel = 'Working...',
  className,
}: FormActionButtonProps) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={className}
    >
      {pending ? pendingLabel : children}
    </button>
  )
}
