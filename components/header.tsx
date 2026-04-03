"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import SignOutButton from "@/components/sign-out-button"

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    let active = true

    supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setIsSignedIn(!!data.user)
      }
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setIsSignedIn(!!session?.user)
      }
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [supabase])

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
            <span className="text-sm font-bold text-primary-foreground">DS</span>
          </div>
          <span className="text-lg font-semibold text-foreground">DeckSwap</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/decks" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Marketplace
          </Link>
          <Link href="/trade-matches" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Trade Matches
          </Link>
          <Link href="/info" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Learn More
          </Link>
          <Link href="/my-decks" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            My Decks
          </Link>
          <Link href="/settings/profile" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Profile
          </Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {isSignedIn ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="border border-emerald-400/20 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15 hover:text-emerald-100"
                asChild
              >
                <Link href="/settings/profile">
                  <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.75)]" />
                  Signed In
                </Link>
              </Button>
              <SignOutButton />
            </>
          ) : (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
          )}
          <Button size="sm" asChild>
            <Link href="/import-deck">Import Deck</Link>
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
        <div className="border-t border-border/80 bg-card/95 px-4 py-4 backdrop-blur-xl md:hidden">
          <nav className="flex flex-col gap-4">
            <Link href="/decks" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Marketplace
            </Link>
            <Link href="/trade-matches" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Trade Matches
            </Link>
            <Link href="/info" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Learn More
            </Link>
            <Link href="/my-decks" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              My Decks
            </Link>
            <Link href="/settings/profile" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Profile
            </Link>
            <div className="flex flex-col gap-2 pt-4">
              {isSignedIn ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-center border border-emerald-400/20 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15 hover:text-emerald-100"
                    asChild
                  >
                    <Link href="/settings/profile">
                      <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.75)]" />
                      Signed In
                    </Link>
                  </Button>
                  <SignOutButton />
                </>
              ) : (
                <Button variant="ghost" size="sm" className="w-full justify-center" asChild>
                  <Link href="/sign-in">Sign In</Link>
                </Button>
              )}
              <Button size="sm" className="w-full justify-center" asChild>
                <Link href="/import-deck">Import Deck</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
