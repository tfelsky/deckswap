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
                Mythiverse Exchange
              </div>
              <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                A better way to sell, trade, and discover complete Magic decks
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Mythiverse Exchange helps players unlock more value from complete decks by making them easier to present, easier to price, and easier to move through trade, direct sale, or auction.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/"
                  className="rounded-2xl border border-border bg-card px-5 py-3 text-sm font-medium text-foreground hover:bg-secondary"
                >
                  Back to Home
                </Link>
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
                  href="/import-library"
                  className="rounded-2xl border border-border bg-card px-5 py-3 text-sm font-medium text-foreground hover:bg-secondary"
                >
                  Import a Library
                </Link>
                <Link
                  href="/checkout-prototype"
                  className="rounded-2xl border border-border bg-card px-5 py-3 text-sm font-medium text-foreground hover:bg-secondary"
                >
                  See Checkout
                </Link>
                <Link
                  href="/auction-prototype"
                  className="rounded-2xl border border-border bg-card px-5 py-3 text-sm font-medium text-foreground hover:bg-secondary"
                >
                  See Auction
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
              <div className="text-sm font-medium text-foreground">Keep more deck value in play</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Trading deck for deck can preserve far more of a deck&apos;s real value than cashing out at the first low offer.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="text-sm font-medium text-foreground">Show why the deck is worth more</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Commanders, tokens, packaging, and presentation details help buyers and traders see the full story instead of just a card total.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="text-sm font-medium text-foreground">Move high-value decks with more confidence</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Reputation, shipping support, and safer exchange flows help serious decks change hands with less friction and more trust.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="mb-12 rounded-3xl border border-border bg-card p-8">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
                Choose the Best Outcome
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground">
                Start with the path that protects the most value
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                The smartest sequence is simple: trade first to maximize value, use Buy It Now when you want a direct sale, and fall back to auction when speed matters most.
              </p>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-border bg-secondary/30 p-5">
                <div className="text-sm font-medium text-foreground">DeckSwap first</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Best when your goal is to keep more value by finding the strongest deck-for-deck match.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-secondary/30 p-5">
                <div className="text-sm font-medium text-foreground">Buy It Now second</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Best when you want a clean direct sale at a price that still reflects the deck&apos;s upside.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-secondary/30 p-5">
                <div className="text-sm font-medium text-foreground">Auction last</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Best when moving the deck quickly matters more than holding out for the highest return.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-12 rounded-3xl border border-border bg-card p-8">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
                Product Roadmap
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground">
                What Mythiverse Exchange can grow into next
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                The long-term vision is bigger than single deck listings. Over time, the platform can expand into store inventory, full collection visibility, premium tools for serious users, and smarter communication that keeps deals moving.
              </p>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-border bg-secondary/30 p-5">
                <div className="text-sm font-medium text-foreground">Local game store registration</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Give local game stores a way to register, upload deck inventory, and sell complete decks through the site with a stronger storefront presence.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-secondary/30 p-5">
                <div className="text-sm font-medium text-foreground">Full collection listings</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Let users go beyond one deck at a time by importing, organizing, and surfacing their broader collection for discovery, trade, and sale.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-secondary/30 p-5">
                <div className="text-sm font-medium text-foreground">Subscription support</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Offer premium access to special features, deeper inventory tools, and advanced seller capabilities for power users and businesses.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-secondary/30 p-5">
                <div className="text-sm font-medium text-foreground">Email notifications that matter</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Keep users in motion with meaningful email alerts for offers, counteroffers, approval events, and lane or status changes that need attention instead of relying on them to constantly check back.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-8">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
                Keep Exploring
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground">
                Trusted places for cards, gear, and collecting essentials
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                These are brands players already know when they want to fill gaps, pick up accessories, or keep upgrading the collection around their next deck move.
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
