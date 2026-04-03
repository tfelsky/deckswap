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
                <Link
                  href="/checkout-prototype"
                  className="rounded-2xl border border-border bg-card px-5 py-3 text-sm font-medium text-foreground hover:bg-secondary"
                >
                  View Checkout Prototype
                </Link>
                <Link
                  href="/holiday-giveback"
                  className="rounded-2xl border border-border bg-card px-5 py-3 text-sm font-medium text-foreground hover:bg-secondary"
                >
                  Holiday Giveback
                </Link>
                <Link
                  href="/paper-power-9"
                  className="rounded-2xl border border-border bg-card px-5 py-3 text-sm font-medium text-foreground hover:bg-secondary"
                >
                  Paper Power 9
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

        <section className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-border bg-card p-8">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
                Suggested Partners
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground">
                Useful marketplaces and accessories while DeckSwap grows
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                These are simple placeholder recommendations for now. In the future, some outbound
                links on DeckSwap may become referral links, which means DeckSwap could earn a
                commission from qualifying purchases.
              </p>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-secondary/30 p-5">
                <div className="text-sm font-medium text-foreground">Top card marketplaces</div>
                <div className="mt-4 space-y-3">
                  <a
                    href="https://www.cardkingdom.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl border border-border bg-background px-4 py-4 text-sm text-muted-foreground hover:bg-secondary"
                  >
                    <span className="font-medium text-foreground">Card Kingdom</span>
                    <span className="mt-1 block">
                      Singles, sealed product, and accessories in one storefront.
                    </span>
                  </a>
                  <a
                    href="https://www.tcgplayer.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl border border-border bg-background px-4 py-4 text-sm text-muted-foreground hover:bg-secondary"
                  >
                    <span className="font-medium text-foreground">TCGplayer</span>
                    <span className="mt-1 block">
                      Large marketplace for trading card singles and sealed inventory.
                    </span>
                  </a>
                  <a
                    href="https://starcitygames.com/mtg/"
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl border border-border bg-background px-4 py-4 text-sm text-muted-foreground hover:bg-secondary"
                  >
                    <span className="font-medium text-foreground">Star City Games</span>
                    <span className="mt-1 block">
                      MTG singles, sealed products, event ecosystem, and buying tools.
                    </span>
                  </a>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-secondary/30 p-5">
                <div className="text-sm font-medium text-foreground">Top accessories brands</div>
                <div className="mt-4 space-y-3">
                  <a
                    href="https://www.dragonshield.com/en-us"
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl border border-border bg-background px-4 py-4 text-sm text-muted-foreground hover:bg-secondary"
                  >
                    <span className="font-medium text-foreground">Dragon Shield</span>
                    <span className="mt-1 block">
                      Sleeves, storage, playmats, and custom sleeve products.
                    </span>
                  </a>
                  <a
                    href="https://ultimateguard.com/en/"
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl border border-border bg-background px-4 py-4 text-sm text-muted-foreground hover:bg-secondary"
                  >
                    <span className="font-medium text-foreground">Ultimate Guard</span>
                    <span className="mt-1 block">
                      Sleeves, deck cases, binders, and MTG-specific accessory lines.
                    </span>
                  </a>
                  <a
                    href="https://ultrapro.com/collections/gaming-accessories"
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl border border-border bg-background px-4 py-4 text-sm text-muted-foreground hover:bg-secondary"
                  >
                    <span className="font-medium text-foreground">Ultra PRO</span>
                    <span className="mt-1 block">
                      Licensed sleeves, deck boxes, playmats, and tabletop accessories.
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <FAQSection />
      </main>
      <Footer />
    </div>
  )
}
