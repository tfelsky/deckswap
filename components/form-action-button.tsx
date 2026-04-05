'use client'

import { useFormStatus } from 'react-dom'
import { LoaderCircle } from 'lucide-react'

type FormActionButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode
  pendingLabel?: string
}

export default function FormActionButton({
  children,
  pendingLabel = 'Working...',
  className,
  disabled,
  ...props
}: FormActionButtonProps) {
  const { pending } = useFormStatus()
  const isDisabled = pending || !!disabled

  return (
    <button
      type="submit"
      disabled={isDisabled}
      aria-busy={pending}
      data-interactive-feedback="true"
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
