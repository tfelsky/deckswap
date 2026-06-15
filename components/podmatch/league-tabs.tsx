import Link from 'next/link'

type Tab = 'overview' | 'players' | 'pods' | 'standings' | 'handicaps'

const TABS: { key: Tab; label: string; href: (id: string) => string }[] = [
  { key: 'overview', label: 'Overview', href: (id) => `/podmatch/leagues/${id}` },
  { key: 'players', label: 'Players & decks', href: (id) => `/podmatch/leagues/${id}/players` },
  { key: 'pods', label: 'Pods', href: (id) => `/podmatch/leagues/${id}/pods` },
  { key: 'standings', label: 'Standings', href: (id) => `/podmatch/leagues/${id}/standings` },
  { key: 'handicaps', label: 'Ratings & handicaps', href: (id) => `/podmatch/leagues/${id}/handicaps` },
]

export default function LeagueTabs({ leagueId, current }: { leagueId: string; current: Tab }) {
  return (
    <nav className="mt-5 flex flex-wrap gap-1.5 border-b border-white/10 pb-3">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href(leagueId)}
          className={`rounded-2xl px-3 py-1.5 text-sm font-medium transition ${
            tab.key === current
              ? 'bg-primary text-primary-foreground'
              : 'border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}
