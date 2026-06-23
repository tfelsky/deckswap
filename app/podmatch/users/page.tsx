import type { Metadata } from 'next'
import {
  Handshake,
  MapPin,
  MessageSquareText,
  RotateCcw,
  Trophy,
  Users,
} from 'lucide-react'
import {
  PodmatchLandingPage,
  playerOutcomeItems,
  sharedFairnessItems,
  type PodmatchLandingContent,
} from '@/components/podmatch/podmatch-landing-page'

export const metadata: Metadata = {
  title: 'PodMatch for Players | Mythiverse Exchange',
  description:
    'PodMatch helps Commander players find more fun pairings, join events, track prizes, and build lasting leagues without power imbalances.',
  alternates: {
    canonical: '/podmatch/users',
  },
}

const content: PodmatchLandingContent = {
  audience: 'PodMatch for Players',
  title: 'Find more fun Commander pairings and leagues that last.',
  lead:
    'PodMatch helps players join better-fit tables, plan event nights, track standings and prizes, and stay in leagues where power gaps do not ruin the room.',
  primaryCta: {
    label: 'Start with PodMatch',
    href: '/podmatch',
  },
  secondaryCta: {
    label: 'Join a store event',
    href: '/podmatch/play',
  },
  stats: [
    { value: '4-player', label: 'pods built around power, pace, and expectations' },
    { value: '1 code', label: 'to join an in-store event and get a table' },
    { value: 'Season', label: 'standings, prizes, and weekly league context' },
  ],
  visual: 'players',
  outcomes: playerOutcomeItems,
  steps: [
    {
      icon: MapPin,
      title: 'Join the event',
      body: 'Use the store code, check in, and get routed into the right event without needing a staff member to rebuild the room by hand.',
    },
    {
      icon: Users,
      title: 'Get a fair pod',
      body: 'PodMatch looks at deck power and league context so your table has room for interaction, politics, and actual games.',
    },
    {
      icon: Trophy,
      title: 'Report and progress',
      body: 'Submit results, see standings move, and keep prize progress visible without making every table feel winner-take-all.',
    },
  ],
  fairness: [
    ...sharedFairnessItems,
    {
      icon: MessageSquareText,
      title: 'Rule-zero clarity',
      body: 'Players get better signals about combos, tutors, speed, and salt before the first mulligan.',
    },
    {
      icon: Handshake,
      title: 'Social repeat play',
      body: 'The system helps you meet more compatible players instead of matching only by whoever arrived at the same time.',
    },
    {
      icon: RotateCcw,
      title: 'Weekly continuity',
      body: 'Leagues give casual nights a memory: returning players, standings, prize history, and reasons to come back.',
    },
  ],
  finalTitle: 'Bring a deck, find the right table, keep the season going.',
  finalBody:
    'Start in PodMatch to analyze a deck, join an event, or follow a league without guessing whether the next pod will be balanced.',
}

export default function PodmatchUsersPage() {
  return <PodmatchLandingPage content={content} />
}
