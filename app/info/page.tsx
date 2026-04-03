import { FAQSection } from "@/components/faq-section"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import Link from "next/link"

export default function InfoPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <section className="border-b border-border bg-gradient-to-b from-background to-secondary/20 py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
                DeckSwap Info
              </div>
              <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                Learn how DeckSwap works without crowding the homepage
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                This page is the deeper guide for importing, pricing, matching, and safer deck
                trades. The homepage can stay focused on the benefits while this page holds the
                operational detail.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/decks"
                  className="rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  Browse Decks
                </Link>
                <Link
                  href="/import-deck"
                  className="rounded-2xl border border-border bg-card px-5 py-3 text-sm font-medium text-foreground hover:bg-secondary"
                >
                  Import a Deck
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="text-sm font-medium text-foreground">Why use DeckSwap</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Value-for-value trading keeps more of the deck&apos;s real inventory value in play.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="text-sm font-medium text-foreground">How to get better results</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Full imports, correct commanders, and token inventory produce cleaner pricing and
                validation.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="text-sm font-medium text-foreground">Where the platform is headed</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Escrow, shipping, insurance, and reputation are designed as trust layers around the
                trade.
              </p>
            </div>
          </div>
        </section>

        <FAQSection />
      </main>
      <Footer />
    </div>
  )
}
