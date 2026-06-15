'use client'

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { HeaderAuth } from "@/components/header-auth"
import { SITE_AREAS, detectArea } from "@/lib/site-nav"

// The persistent top bar: the site's main sections, identical on every page.
// The active section is highlighted; sub-functions live in ContextNav below.
export function Header() {
  const pathname = usePathname() || ""
  const activeKey = detectArea(pathname)?.key
  const sections = SITE_AREAS.filter((area) => area.inMainBar)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
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

        <nav className="hidden items-center gap-5 lg:flex xl:gap-6">
          {sections.map((section) => (
            <Link
              key={section.key}
              href={section.href}
              className={`text-sm transition-colors hover:text-foreground ${
                section.key === activeKey ? "font-medium text-foreground" : "text-muted-foreground"
              }`}
            >
              {section.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <HeaderAuth />
          <Button size="sm" asChild>
            <Link href="/import-deck">Import Deck</Link>
          </Button>
        </div>

        <details className="group lg:hidden">
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
              {sections.map((section) => (
                <Link
                  key={section.key}
                  href={section.href}
                  className={`text-sm transition-colors hover:text-foreground ${
                    section.key === activeKey ? "font-medium text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {section.label}
                </Link>
              ))}
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
