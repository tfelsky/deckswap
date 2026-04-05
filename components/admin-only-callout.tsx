import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type AdminOnlyCalloutProps = {
  title: string
  description?: string
  className?: string
  children?: ReactNode
}

export function AdminOnlyCallout({
  title,
  description,
  className,
  children,
}: AdminOnlyCalloutProps) {
  return (
    <div
      className={cn(
        'rounded-[1.5rem] border-2 border-dashed border-amber-300/45 bg-[linear-gradient(135deg,rgba(251,191,36,0.2),rgba(24,24,27,0.96))] p-5 shadow-[0_0_0_1px_rgba(251,191,36,0.12)_inset]',
        className
      )}
    >
      <div className="inline-flex rounded-full border border-amber-200/40 bg-black/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-100">
        Admin Only
      </div>
      <div className="mt-3 rounded-2xl border border-amber-100/20 bg-black/25 p-4">
        <div className="text-sm font-semibold text-amber-100">{title}</div>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-amber-50/80">{description}</p>
        ) : null}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  )
}
