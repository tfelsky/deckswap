import type { Metadata } from 'next'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { LgsEventsScheduler } from '@/components/lgs-events-scheduler'

export const metadata: Metadata = {
  title: 'LGS Magic Event Calendar | Mythiverse Exchange',
  description:
    'A Mythivex schedule and checkout workflow for local game store Magic events, including formats, costs, prizes, rounds, rules, decklist submission, signup, and checkout.',
  alternates: {
    canonical: '/lgs-events',
  },
}

export default function LgsEventsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <LgsEventsScheduler />
      </main>
      <Footer />
    </div>
  )
}
