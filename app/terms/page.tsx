import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { ComplianceLinks } from '@/components/compliance-links'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <section className="border-b border-border bg-gradient-to-b from-background to-secondary/20 py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="inline-flex rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
              Terms and Conditions
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Terms and Conditions
            </h1>
            <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
              These terms describe the rules, expectations, limitations, and disclosures that apply
              to use of Mythiverse Exchange and its marketplace-style features.
            </p>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
              This draft should be finalized with legal review before launch so it accurately
              reflects the live product, payment flows, dispute handling, and user obligations.
            </p>
            <ComplianceLinks current="/terms" />
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="space-y-8 rounded-3xl border border-border bg-card p-8">
            <section>
              <h2 className="text-2xl font-semibold text-foreground">Use of the Service</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                DeckSwap is a marketplace-style platform for deck listings, imports, pricing
                experiments, and future trade workflows. Users are responsible for the accuracy of
                their listings, the legality of their conduct, and their use of any trade or
                shipping flows described on the site.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground">No Guarantee of Trade Completion</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Any matching, pricing, escrow, shipping, insurance, or checkout experiences shown
                on the site may be prototypes, roadmap concepts, or incomplete features unless
                explicitly stated otherwise. DeckSwap does not guarantee that a trade, listing, or
                proposed settlement will be completed.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground">Pricing and Valuation</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Deck pricing, card pricing, bracket labels, and other marketplace signals are
                informational estimates only. They are not professional appraisals and should not
                be treated as guaranteed market values, settlement values, or buylist offers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground">User Responsibility</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Users are responsible for confirming deck contents, card condition, legality,
                shipping details, and the suitability of any trade. Users should not rely solely on
                automated parsing, pricing, or validation outputs when making real-world decisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground">Prototype Features</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Some pages and workflows on DeckSwap may be prototypes or placeholders, including
                payment, escrow, checkout, verification, and business-operations features. Those
                experiences may be changed, removed, or left inactive at any time.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground">Outbound Links and Referral Disclosure</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                DeckSwap may provide links to third-party marketplaces, accessory vendors, or other
                external services for user convenience. Some of those links may later become
                referral or affiliate links, which means DeckSwap could earn a commission if a user
                makes a purchase after following them. Unless explicitly stated on the page,
                inclusion of a third-party link does not mean DeckSwap guarantees, controls, or
                endorses that third party&apos;s products, policies, pricing, or fulfillment.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground">Limitation of Liability</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                To the fullest extent permitted by law, DeckSwap is provided on an as-is and
                as-available basis, without warranties of any kind. DeckSwap disclaims liability
                for listing errors, import errors, pricing inaccuracies, trade disputes, shipping
                failures, lost packages, or other damages arising from use of the service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground">Termination</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                DeckSwap may suspend, restrict, or terminate access to the service at any time,
                especially in cases of abuse, fraud, misuse, or conduct that creates risk for the
                platform or other users.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground">Policy Relationship</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                These terms should be read together with the Privacy Policy and Accessibility
                Statement. Product claims, consent flows, and support commitments should remain
                consistent across all public-facing compliance pages.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground">Trademark and Affiliation Notice</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                DeckSwap is not affiliated with, endorsed by, sponsored by, or specifically
                approved by Hasbro, Wizards of the Coast, or Magic: The Gathering. Magic: The
                Gathering and related names, marks, characters, and game elements are the property
                of their respective owners.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground">Changes to These Terms</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                These terms may be revised as DeckSwap evolves. Continued use of the service after
                updates may be treated as acceptance of the revised terms.
              </p>
            </section>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
