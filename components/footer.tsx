import Link from "next/link"
import Image from "next/image"

const footerLinks = {
  marketplace: [
    { name: "Browse Decks", href: "/decks" },
    { name: "Singles", href: "/singles" },
    { name: "Create Deck", href: "/create-deck" },
    { name: "Import Deck", href: "/import-deck" },
    { name: "Live Auctions", href: "/auctions" },
  ],
  trading: [
    { name: "Deck Swap", href: "/trade-matches" },
    { name: "How DeckSwap Works", href: "/info" },
    { name: "Trade Offers", href: "/trade-offers" },
    { name: "Trades Workspace", href: "/trades" },
    { name: "My Decks", href: "/my-decks" },
  ],
  resources: [
    { name: "For Game Stores", href: "/for-stores" },
    { name: "LGS Event Calendar", href: "/lgs-events" },
    { name: "Store Pricing", href: "/pricing" },
    { name: "LGS TV", href: "/lgs-tv" },
    { name: "Prebuy Subscriptions", href: "/comic-subscriptions" },
    { name: "PodMatch for Players", href: "/podmatch/users" },
    { name: "PodMatch for Stores", href: "/podmatch/stores" },
    { name: "Completed Sales", href: "/completed-sales" },
    { name: "Holiday Giveback", href: "/holiday-giveback" },
    { name: "Paper Power 9", href: "/paper-power-9" },
  ],
  company: [
    { name: "Compliance", href: "/compliance" },
    { name: "Cookies and Consent", href: "/cookies" },
    { name: "Sustainability", href: "/sustainability" },
    { name: "Accessibility", href: "/accessibility" },
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms", href: "/terms" },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-border/80 bg-card/50 py-16 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <Image
                src="/mythiverse-shield.png"
                alt="Mythiverse Exchange shield logo"
                width={40}
                height={40}
                className="h-10 w-10 rounded-xl object-cover shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
              />
              <span className="text-lg font-semibold text-foreground">Mythiverse Exchange</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              A deck marketplace for complete Commander decks, value-preserving trades, and
              clearer selling paths.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-foreground">Marketplace</h4>
            <ul className="space-y-3">
              {footerLinks.marketplace.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-foreground">DeckSwap</h4>
            <ul className="space-y-3">
              {footerLinks.trading.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-foreground">Resources</h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-foreground">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            (c) {new Date().getFullYear()} Mythiverse Exchange. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 sm:justify-end">
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
              Terms
            </Link>
            <Link href="/cookies" className="text-sm text-muted-foreground hover:text-foreground">
              Cookies
            </Link>
            <Link href="/accessibility" className="text-sm text-muted-foreground hover:text-foreground">
              Accessibility
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
