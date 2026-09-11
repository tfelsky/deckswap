import type { Metadata } from 'next'
import { RadioTower } from 'lucide-react'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import LiveAuctionClient from '@/components/live-auction-client'

export const metadata: Metadata = {
  title: 'Mythivex Live | Mythiverse Exchange',
  description:
    'Mythivex Live is a 24/7 live-commerce auction channel: single-card lots on the block around the clock, called by a barker with color commentary between every hammer.',
  alternates: {
    canonical: '/live-auctions',
  },
}

export default function LiveAuctionsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.22em] text-primary">
              <RadioTower className="h-4 w-4" />
              Mythivex Live
            </div>
            <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              The card auction that never signs off.
            </h1>
            <p className="mt-4 text-pretty text-lg leading-8 text-muted-foreground">
              A new lot hits the block every 90 seconds, around the clock. Our barker calls the
              action, the booth talks the market, and the hammer never gets cold.
            </p>
          </div>

          <LiveAuctionClient />
        </section>
      </main>
      <Footer />
    </div>
  )
}
