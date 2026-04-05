import type { Metadata } from 'next'
import { Footer } from '@/components/footer'
import { ComplianceLinks } from '@/components/compliance-links'
import { Header } from '@/components/header'

const cookieRows = [
  {
    category: 'Essential authentication',
    purpose:
      'Used to support sign-in, account access, and session continuity through Supabase authentication flows.',
    storage: 'Cookies managed by the authentication stack',
    defaultState: 'Always active when required for account use',
  },
  {
    category: 'Analytics consent preference',
    purpose:
      'Stores whether a visitor accepted or declined optional analytics so the site can respect that choice on future visits.',
    storage:
      'First-party cookie `deckswap_analytics_consent` and browser local storage key `deckswap_analytics_consent`',
    defaultState: 'Set only after the visitor makes a choice',
  },
  {
    category: 'Optional analytics and performance measurement',
    purpose:
      'Vercel Analytics and Vercel Speed Insights are loaded only after a visitor opts in to optional analytics.',
    storage: 'Loaded only after consent is accepted',
    defaultState: 'Off by default',
  },
]

export const metadata: Metadata = {
  title: 'Cookies and Consent | Mythiverse Exchange',
  description:
    'Cookie and consent information for Mythiverse Exchange, including analytics behavior, storage details, and retention of consent preferences.',
}

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <section className="border-b border-border bg-gradient-to-b from-background to-secondary/20 py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="inline-flex rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
              Cookies and Consent
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Cookies, analytics, retention, and consent behavior
            </h1>
            <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
              This page documents how Mythiverse Exchange currently handles essential
              authentication cookies, optional analytics, consent preferences, and related
              retention behavior so public policy language matches the live product experience.
            </p>
            <ComplianceLinks current="/cookies" />
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-border bg-card p-8">
            <h2 className="text-2xl font-semibold text-foreground">Current behavior</h2>
            <div className="mt-6 space-y-4">
              {cookieRows.map((row) => (
                <div key={row.category} className="rounded-2xl border border-border bg-background/40 p-5">
                  <h3 className="text-lg font-semibold text-foreground">{row.category}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{row.purpose}</p>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    <span className="font-medium text-foreground">Storage:</span> {row.storage}
                  </p>
                  <p className="text-sm leading-7 text-muted-foreground">
                    <span className="font-medium text-foreground">Default state:</span>{' '}
                    {row.defaultState}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-border bg-card p-8">
              <h2 className="text-2xl font-semibold text-foreground">Consent flow</h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                On first visit, the site shows a privacy choices banner. Visitors can choose to
                keep analytics off or allow analytics. Optional analytics do not load unless the
                visitor explicitly opts in.
              </p>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                After a choice is made, visitors can reopen privacy choices from the floating
                controls on the site and change that preference later.
              </p>
            </div>

            <div className="rounded-3xl border border-border bg-card p-8">
              <h2 className="text-2xl font-semibold text-foreground">Retention of consent</h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                The consent preference is currently stored for up to 180 days using the
                first-party cookie `deckswap_analytics_consent`. The same accepted or declined
                preference is also mirrored in browser local storage under the key
                `deckswap_analytics_consent`.
              </p>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                If these retention periods or storage methods change, the Privacy Policy and this
                page should be updated at the same time.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-border bg-card p-8">
            <h2 className="text-2xl font-semibold text-foreground">Policy alignment notes</h2>
            <ul className="mt-5 space-y-3">
              <li className="rounded-2xl border border-border bg-background/40 px-4 py-4 text-sm leading-7 text-muted-foreground">
                Essential cookies remain active for authentication and account access.
              </li>
              <li className="rounded-2xl border border-border bg-background/40 px-4 py-4 text-sm leading-7 text-muted-foreground">
                Optional analytics are off by default and require affirmative consent.
              </li>
              <li className="rounded-2xl border border-border bg-background/40 px-4 py-4 text-sm leading-7 text-muted-foreground">
                Visitors can revisit and change analytics preferences after the initial choice.
              </li>
              <li className="rounded-2xl border border-border bg-background/40 px-4 py-4 text-sm leading-7 text-muted-foreground">
                Data retention wording in public policies should stay consistent with actual
                account, listing, and operational retention practices as those are formalized.
              </li>
            </ul>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
