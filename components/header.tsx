import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { HeaderAuth } from "@/components/header-auth"

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/mythiverse-shield.png"
            alt="Mythiverse Exchange shield logo"
            width={48}
            height={48}
            className="h-12 w-12 rounded-xl object-cover shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
          />
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
            <span className="text-sm font-bold text-primary-foreground">ME</span>
          </div>
          <span className="text-lg font-semibold text-foreground">Mythiverse Exchange</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/decks" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Marketplace
          </Link>
          <Link href="/trade-matches" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Deck Swap
          </Link>
          <Link href="/info" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Learn More
          </Link>
          <Link href="/support" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Support
          </Link>
          <Link href="/my-decks" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            My Decks
          </Link>
          <Link href="/my-singles" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            My Singles
          </Link>
          <Link href="/settings/profile" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Profile
          </Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <HeaderAuth />
          <Button size="sm" asChild>
            <Link href="/import-deck">Import Deck</Link>
          </Button>
        </div>

        <details className="group md:hidden">
          <summary className="list-none cursor-pointer [&::-webkit-details-marker]:hidden" aria-label="Toggle menu">
            <span className="group-open:hidden">
              <Menu className="h-6 w-6 text-foreground" />
            </span>
            <span className="hidden group-open:inline">
              <X className="h-6 w-6 text-foreground" />
            </span>
          </summary>
          <div className="absolute left-0 right-0 top-16 border-t border-border/80 bg-card/95 px-4 py-4 backdrop-blur-xl">
            <nav className="flex flex-col gap-4">
              <Link href="/decks" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Marketplace
              </Link>
              <Link href="/trade-matches" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Deck Swap
              </Link>
              <Link href="/info" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Learn More
              </Link>
              <Link href="/support" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Support
              </Link>
              <Link href="/my-decks" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                My Decks
              </Link>
              <Link href="/my-singles" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                My Singles
              </Link>
              <Link href="/settings/profile" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Profile
              </Link>
              <div className="flex flex-col gap-2 pt-4">
                <HeaderAuth />
                <Button size="sm" className="w-full justify-center" asChild>
                  <Link href="/import-deck">Import Deck</Link>
                </Button>
              </div>
            </nav>
          </div>
        </details>
      </div>
    </header>
  )
}
