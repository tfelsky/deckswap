import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <section className="border-b border-border bg-gradient-to-b from-background to-secondary/20 py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="inline-flex rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
              Privacy Policy
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Privacy Policy
            </h1>
            <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
              This is a placeholder privacy policy for DeckSwap. It is intentionally generic for
              now and should be reviewed by legal counsel before public launch.
            </p>
            <div className="mt-8">
              <Link
                href="/terms"
                className="rounded-2xl border border-border bg-card px-5 py-3 text-sm font-medium text-foreground hover:bg-secondary"
              >
                View Terms and Conditions
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="space-y-8 rounded-3xl border border-border bg-card p-8">
            <section>
              <h2 className="text-2xl font-semibold text-foreground">Information We Collect</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                DeckSwap may collect account details, deck listings, imported deck contents,
                shipping-related information, communications with support, and general analytics
                about how the site is used. Payment and identity-verification flows described on
                the site may be added later, but they are not fully implemented in this placeholder
                policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground">Cookies and Analytics Choices</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                DeckSwap uses essential cookies needed for authentication and account access.
                Optional analytics and performance measurement tools are disabled by default until a
                visitor opts in through the privacy choices prompt. Visitors can change that choice
                later from the privacy controls available on the site.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground">How We Use Information</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                DeckSwap may use collected information to operate the marketplace, support imports,
                display deck listings, improve pricing and matching systems, provide customer
                support, prevent abuse, and communicate product updates or service notices.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground">Sharing</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                DeckSwap may share limited information with service providers that help run the
                site, such as hosting, analytics, authentication, or payment vendors. DeckSwap may
                also disclose information when required by law or when reasonably necessary to
                protect users, the service, or DeckSwap&apos;s rights.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground">External Links and Referral Programs</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                DeckSwap may link to third-party marketplaces or accessory vendors. In the future,
                some of those outbound links may use referral or affiliate tracking. If that
                happens, DeckSwap may receive a commission from qualifying purchases. Third-party
                sites operate under their own privacy practices and terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground">User Content</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Deck lists, deck images, and listing details submitted by users may appear on
                public-facing parts of the service. Users should avoid including sensitive personal
                information in public listing content.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground">Security</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                DeckSwap intends to use reasonable technical and operational safeguards, but no
                system can guarantee complete security. Users submit and use the service at their
                own risk until formal security, payments, escrow, and verification systems are
                productionized.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground">Retention and Deletion</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                DeckSwap may retain account, listing, and operational data for as long as
                reasonably needed to run the service, resolve disputes, meet legal obligations, or
                improve the platform. A more specific retention schedule can be added later.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground">Trademark and Affiliation Notice</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                DeckSwap is an independent fan-built marketplace and is not affiliated with,
                endorsed by, sponsored by, or specifically approved by Hasbro, Wizards of the
                Coast, or Magic: The Gathering. Magic: The Gathering and related names, marks,
                characters, and game elements are the property of their respective owners.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground">Changes</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                This placeholder policy may be updated at any time as the platform evolves. When a
                formal production policy is adopted, it should replace this draft.
              </p>
            </section>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
