import type { Metadata } from 'next'
import Link from 'next/link'
import { Footer } from '@/components/footer'
import { ComplianceLinks } from '@/components/compliance-links'
import { Header } from '@/components/header'

const compliancePages = [
  {
    title: 'Sustainability',
    href: '/sustainability',
    badge: 'Sustainability',
    body:
      'Covers land acknowledgement, material sustainability topics, waste reduction, supply-chain human rights, and the most relevant UN Sustainable Development Goals.',
  },
  {
    title: 'Accessibility Statement',
    href: '/accessibility',
    badge: 'AODA and WCAG',
    body:
      'Explains the site accessibility commitment, the design checks used to support accessible experiences, and the next steps needed for public accessibility feedback handling.',
  },
  {
    title: 'Privacy Policy',
    href: '/privacy',
    badge: 'Privacy',
    body:
      'Covers the information the platform may collect, how it may be used, analytics and cookie choices, sharing practices, and retention and deletion expectations.',
  },
  {
    title: 'Terms and Conditions',
    href: '/terms',
    badge: 'Terms',
    body:
      'Sets expectations around use of the service, prototype features, pricing and valuation disclaimers, third-party links, and limitation of liability.',
  },
]

const nextSteps = [
  'Add a public contact method for privacy and accessibility requests before launch.',
  'Replace placeholder policy language with counsel-reviewed production text.',
  'Document cookie, analytics, retention, and consent behavior so site behavior matches the public policies.',
  'Define supplier due diligence and training expectations for forced labour and child labour risk management.',
  'Review new product flows against accessibility, privacy, and terms impacts before release.',
]

export const metadata: Metadata = {
  title: 'Compliance | Mythiverse Exchange',
  description:
    'Compliance hub for Mythiverse Exchange, linking accessibility, privacy, and terms pages and outlining key pre-launch compliance steps.',
}

export default function CompliancePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <section className="border-b border-border bg-gradient-to-b from-background to-secondary/20 py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="inline-flex rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
              Compliance
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Compliance and policy center
            </h1>
            <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
              This page brings together the public trust and compliance materials for Mythiverse
              Exchange, including accessibility, privacy, and terms. It helps users and internal
              teams find the relevant policy pages in one place.
            </p>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
              These materials are still pre-launch and should be finalized with legal and
              operational review before the platform is presented as production-ready.
            </p>
            <ComplianceLinks current="/compliance" />
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {compliancePages.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className="rounded-3xl border border-border bg-card p-6 transition hover:bg-secondary/40"
              >
                <div className="inline-flex rounded-full border border-border bg-background/50 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-primary/80">
                  {page.badge}
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-foreground">{page.title}</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{page.body}</p>
                <div className="mt-5 text-sm font-medium text-foreground">Open page</div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-border bg-card p-8">
            <h2 className="text-2xl font-semibold text-foreground">Recommended next compliance steps</h2>
            <ul className="mt-5 space-y-3">
              {nextSteps.map((step) => (
                <li
                  key={step}
                  className="rounded-2xl border border-border bg-background/40 px-4 py-4 text-sm leading-7 text-muted-foreground"
                >
                  {step}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
