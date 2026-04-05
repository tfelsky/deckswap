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
        'rounded-[1.25rem] border-2 border-dashed border-amber-300/45 bg-[linear-gradient(135deg,rgba(251,191,36,0.18),rgba(24,24,27,0.96))] p-4 shadow-[0_0_0_1px_rgba(251,191,36,0.12)_inset]',
        className
      )}
    >
      <div className="inline-flex rounded-full border border-amber-200/40 bg-black/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-100">
        Admin Only
      </div>
      <div className="mt-2 rounded-xl border border-amber-100/20 bg-black/25 p-3">
        <div className="text-sm font-semibold text-amber-100">{title}</div>
        {description ? (
          <p className="mt-1.5 text-sm leading-6 text-amber-50/80">{description}</p>
        ) : null}
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  )
}
