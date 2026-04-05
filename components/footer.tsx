import Link from "next/link"

const footerLinks = {
  marketplace: [
    { name: "Browse Decks", href: "/decks" },
    { name: "Create Deck", href: "/create-deck" },
    { name: "Import Deck", href: "/import-deck" },
    { name: "My Decks", href: "/my-decks" },
  ],
  trading: [
    { name: "Deck Swap", href: "/trade-matches" },
    { name: "Trade Offers", href: "/trade-offers" },
    { name: "Info & FAQ", href: "/info" },
    { name: "Trades Workspace", href: "/trades" },
  ],
  community: [
    { name: "Deck Comments", href: "/decks" },
    { name: "Guest Import Preview", href: "/guest-import" },
    { name: "Checkout Prototype", href: "/checkout-prototype" },
    { name: "Auction Prototype", href: "/auction-prototype" },
    { name: "Holiday Giveback", href: "/holiday-giveback" },
    { name: "Paper Power 9", href: "/paper-power-9" },
  ],
  company: [
    { name: "About Mythiverse Exchange", href: "/" },
    { name: "Compliance", href: "/compliance" },
    { name: "Sustainability", href: "/sustainability" },
    { name: "Accessibility", href: "/accessibility" },
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms", href: "/terms" },
    { name: "Sign In", href: "/sign-in" },
    { name: "Admin Tools", href: "/admin/backfill-decks" },
    { name: "Home", href: "/" },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-border/80 bg-card/50 py-16 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
                <span className="text-sm font-bold text-primary-foreground">ME</span>
              </div>
              <span className="text-lg font-semibold text-foreground">Mythiverse Exchange</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              A deck marketplace centered on value-for-value trading, cleaner imports, and better
              inventory context.
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
            <h4 className="mb-4 text-sm font-semibold text-foreground">Trading</h4>
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
            <h4 className="mb-4 text-sm font-semibold text-foreground">Community</h4>
            <ul className="space-y-3">
              {footerLinks.community.map((link) => (
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
          <div className="flex gap-6">
            <Link href="/decks" className="text-sm text-muted-foreground hover:text-foreground">
              Marketplace
            </Link>
            <Link href="/info" className="text-sm text-muted-foreground hover:text-foreground">
              Info
            </Link>
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
              Privacy
            </Link>
            <Link href="/compliance" className="text-sm text-muted-foreground hover:text-foreground">
              Compliance
            </Link>
            <Link href="/sustainability" className="text-sm text-muted-foreground hover:text-foreground">
              Sustainability
            </Link>
            <Link href="/accessibility" className="text-sm text-muted-foreground hover:text-foreground">
              Accessibility
            </Link>
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
              Terms
            </Link>
            <Link href="/my-decks" className="text-sm text-muted-foreground hover:text-foreground">
              My Decks
            </Link>
            <Link href="/sign-in" className="text-sm text-muted-foreground hover:text-foreground">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
