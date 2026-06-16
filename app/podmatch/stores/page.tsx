import type { Metadata } from 'next'
import {
  BadgeDollarSign,
  CalendarClock,
  ClipboardCheck,
  Megaphone,
  ShieldCheck,
  Trophy,
} from 'lucide-react'
import {
  PodmatchLandingPage,
  sharedFairnessItems,
  storeOutcomeItems,
  type PodmatchLandingContent,
} from '@/components/podmatch/podmatch-landing-page'

export const metadata: Metadata = {
  title: 'PodMatch for Stores | Mythiverse Exchange',
  description:
    'PodMatch helps local game stores plan Commander events, manage tournament pods, handle prizes, and build lasting leagues without power imbalances.',
  alternates: {
    canonical: '/podmatch/stores',
  },
}

const content: PodmatchLandingContent = {
  audience: 'PodMatch for Stores',
  title: 'Run Commander nights that players want to return to.',
  lead:
    'PodMatch gives local game stores the event layer around Commander: fair pairings, tournament flow, prize handling, and leagues that grow without letting power imbalances hollow out attendance.',
  primaryCta: {
    label: 'Talk to partnerships',
    href: 'mailto:partners@mythivex.com?subject=PodMatch%20for%20stores',
  },
  secondaryCta: {
    label: 'See player experience',
    href: '/podmatch/users',
  },
  stats: [
    { value: 'Pods', label: 'generated around player count, deck strength, and event goals' },
    { value: 'Prizes', label: 'tracked as credit, raffles, points, or season rewards' },
    { value: 'Leagues', label: 'built for repeat weekly attendance, not one-off chaos' },
  ],
  visual: 'stores',
  outcomes: storeOutcomeItems,
  steps: [
    {
      icon: CalendarClock,
      title: 'Create the event',
      body: 'Set the date, capacity, format, prize approach, and whether the night is casual pods, league play, or a tournament-style event.',
    },
    {
      icon: ClipboardCheck,
      title: 'Check in and pair',
      body: 'Players join by code, staff reviews attendance, and PodMatch builds tables that respect power bands and event goals.',
    },
    {
      icon: Trophy,
      title: 'Run prizes and standings',
      body: 'Track results, prize eligibility, raffle entries, season points, and standings without rebuilding spreadsheets every week.',
    },
  ],
  fairness: [
    ...sharedFairnessItems,
    {
      icon: ShieldCheck,
      title: 'Protect new-player nights',
      body: 'Keep new or casual players from getting seated into a power gap that makes the store feel hostile.',
    },
    {
      icon: BadgeDollarSign,
      title: 'Support better event revenue',
      body: 'Leagues and repeat attendance create a steadier event lane for entry fees, store credit, snacks, sleeves, and deck upgrades.',
    },
    {
      icon: Megaphone,
      title: 'Promote the next visit',
      body: 'Use league history, standings, prize reminders, and LGS TV moments to give players a reason to return next week.',
    },
  ],
  finalTitle: 'Give Commander night structure without draining the fun out of it.',
  finalBody:
    'Use PodMatch to turn open play into managed events, tournaments, prize nights, and leagues that players trust enough to join again.',
}

export default function PodmatchStoresPage() {
  return <PodmatchLandingPage content={content} />
}
