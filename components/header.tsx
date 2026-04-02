"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { useState } from "react"

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">DS</span>
          </div>
          <span className="text-lg font-semibold text-foreground">DeckSwap</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link href="#decks" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Browse Decks
          </Link>
          <Link href="#trade" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Trade
          </Link>
          <Link href="#how-it-works" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            How It Works
          </Link>
          <Link href="#community" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Community
          </Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" size="sm">
            Sign In
          </Button>
          <Button size="sm">
            Get Started
          </Button>
        </div>

        <button
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6 text-foreground" />
          ) : (
            <Menu className="h-6 w-6 text-foreground" />
          )}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-border bg-background px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            <Link href="#decks" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Browse Decks
            </Link>
            <Link href="#trade" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Trade
            </Link>
            <Link href="#how-it-works" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              How It Works
            </Link>
            <Link href="#community" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Community
            </Link>
            <div className="flex flex-col gap-2 pt-4">
              <Button variant="ghost" size="sm" className="w-full justify-center">
                Sign In
              </Button>
              <Button size="sm" className="w-full justify-center">
                Get Started
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
