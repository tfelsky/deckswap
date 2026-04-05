import Link from 'next/link'

const links = [
  { href: '/compliance', label: 'Compliance Center' },
  { href: '/accessibility', label: 'Accessibility' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
]

type ComplianceLinksProps = {
  current: string
}

export function ComplianceLinks({ current }: ComplianceLinksProps) {
  return (
    <div className="mt-8 flex flex-wrap gap-3">
      {links
        .filter((link) => link.href !== current)
        .map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-2xl border border-border bg-card px-5 py-3 text-sm font-medium text-foreground hover:bg-secondary"
          >
            View {link.label}
          </Link>
        ))}
    </div>
  )
}
