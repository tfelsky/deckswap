import type { Metadata } from 'next'
import Link from 'next/link'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'

const commitments = [
  {
    title: 'Designed toward WCAG 2.1 Level AA',
    body:
      'We aim to make core browsing, account, import, and trading workflows understandable and operable for people using keyboards, screen readers, magnification, and other assistive technologies.',
  },
  {
    title: 'Accessibility considered during design and release',
    body:
      'We review new screens for color contrast, visible focus states, semantic headings, link clarity, form labels, and keyboard access before treating a workflow as ready.',
  },
  {
    title: 'Continuous improvement',
    body:
      'Accessibility is an ongoing practice, not a one-time claim. We expect to revisit and improve content, interaction patterns, and technical implementation as the product evolves.',
  },
]

const designChecks = [
  'Use semantic HTML landmarks, headings, lists, buttons, and labels before adding custom interaction.',
  'Keep text contrast and non-text contrast at or above accessible thresholds for default, hover, focus, and disabled states.',
  'Preserve full keyboard access with logical tab order, visible focus indicators, and no pointer-only actions.',
  'Do not rely on color alone to communicate status, errors, urgency, or success.',
  'Support zoom and reflow at 200 percent without loss of content or functionality on common viewport widths.',
  'Provide descriptive link text, alt text for meaningful images, and clear instructions for complex tasks.',
  'Respect reduced motion preferences and avoid animation that distracts from task completion.',
  'Test forms for labels, error identification, inline guidance, and assistive technology announcements where needed.',
]

export const metadata: Metadata = {
  title: 'Accessibility Statement | Mythiverse Exchange',
  description:
    'Accessibility statement for Mythiverse Exchange, including AODA-informed commitments and the design practices used to support accessible experiences.',
}

export default function AccessibilityPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <section className="border-b border-border bg-gradient-to-b from-background to-secondary/20 py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="inline-flex rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
              Accessibility Statement
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Accessibility for Ontario and Canadian users
            </h1>
            <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
              Mythiverse Exchange is working to provide an experience that is accessible,
              inclusive, and aligned with the Accessibility for Ontarians with Disabilities Act
              (AODA) and recognized digital accessibility practices, including WCAG 2.1 Level AA.
            </p>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
              This page is a product accessibility statement, not legal advice. Formal legal review
              and organization-specific compliance processes should be completed before public
              launch.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/privacy"
                className="rounded-2xl border border-border bg-card px-5 py-3 text-sm font-medium text-foreground hover:bg-secondary"
              >
                View Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="rounded-2xl border border-border bg-card px-5 py-3 text-sm font-medium text-foreground hover:bg-secondary"
              >
                View Terms
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="space-y-8 rounded-3xl border border-border bg-card p-8">
            <section>
              <h2 className="text-2xl font-semibold text-foreground">Our commitment</h2>
              <div className="mt-5 grid gap-4">
                {commitments.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-border bg-background/40 p-5"
                  >
                    <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.body}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground">How we make compliant design choices</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                To support accessible outcomes in practice, we use the following design and
                implementation checks when creating or updating pages:
              </p>
              <ul className="mt-5 space-y-3">
                {designChecks.map((item) => (
                  <li
                    key={item}
                    className="rounded-2xl border border-border bg-background/40 px-4 py-4 text-sm leading-7 text-muted-foreground"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground">Current scope and limitations</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Some areas of Mythiverse Exchange are still prototype or pre-launch workflows. That
                means accessibility improvements may still be in progress for advanced marketplace,
                shipping, or trading experiences. When a barrier is identified, it should be
                prioritized alongside product and technical fixes rather than deferred as a polish
                task.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground">Feedback and alternate formats</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                This site should provide a clearly published accessibility feedback channel before
                launch so users can report barriers and request support or alternate formats. That
                public contact method is not yet listed on the site, so adding one is a recommended
                next compliance step.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground">Review cadence</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Accessibility should be reviewed whenever major navigation, forms, checkout flows,
                deck management, or trading interactions change. Periodic manual testing with
                keyboard-only navigation and screen reader spot checks should complement automated
                linting and contrast validation.
              </p>
            </section>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
