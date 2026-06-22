'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  CreditCard,
  DollarSign,
  FileText,
  MapPin,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type EventDay = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'

type LgsEvent = {
  id: string
  day: EventDay
  startTime: string
  endTime: string
  title: string
  format: string
  audience: string
  cost: number
  capacity: number
  seatsLeft: number
  rounds: string
  prize: string
  rules: string[]
  decklist: string
  judge: string
  location: string
  tags: string[]
}

const days: Array<EventDay | 'All Week'> = [
  'All Week',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

const events: LgsEvent[] = [
  {
    id: 'mon-commander-league',
    day: 'Monday',
    startTime: '6:00 PM',
    endTime: '10:00 PM',
    title: 'Commander League Night',
    format: 'Commander',
    audience: 'Casual league pods',
    cost: 10,
    capacity: 48,
    seatsLeft: 14,
    rounds: '3 timed pod rounds, 65 minutes each',
    prize: 'League points, promo pack raffle, $5 store credit per pod winner',
    rules: [
      'Rule 0 power check before pods are assigned.',
      'No mass land destruction before turn six unless the pod agrees.',
      'Extra turns are capped at one additional turn per player.',
    ],
    decklist: 'Optional decklist upload. Required only for prize league standings.',
    judge: 'Store staff with PodMatch pairing support',
    location: 'Main play room',
    tags: ['PodMatch', 'League', 'Casual'],
  },
  {
    id: 'tue-standard-showdown',
    day: 'Tuesday',
    startTime: '6:30 PM',
    endTime: '9:30 PM',
    title: 'Standard Showdown',
    format: 'Standard',
    audience: 'Competitive constructed',
    cost: 12,
    capacity: 32,
    seatsLeft: 9,
    rounds: '3 Swiss rounds, best of three',
    prize: 'Pack-per-win plus top four promo picks',
    rules: [
      'Current Standard legality and official banned list apply.',
      'Decklists lock at check-in.',
      'Slow play warnings follow store judge policy.',
    ],
    decklist: 'Required before round one. Paste list or attach Moxfield link at signup.',
    judge: 'Certified judge on call',
    location: 'Tournament tables',
    tags: ['Swiss', 'Decklist required', 'Prize packs'],
  },
  {
    id: 'wed-draft',
    day: 'Wednesday',
    startTime: '7:00 PM',
    endTime: '10:30 PM',
    title: 'Booster Draft',
    format: 'Limited Draft',
    audience: 'Draft regulars and newer drafters',
    cost: 22,
    capacity: 24,
    seatsLeft: 6,
    rounds: 'Draft plus 3 Swiss rounds, best of three',
    prize: '1.5 packs per player into prize pool, paid by record',
    rules: [
      'Pods fire at eight players when possible.',
      'Store supplies basic lands.',
      'Rare redrafting is not used.',
    ],
    decklist: 'Not required. Pool registration only for sanctioned events.',
    judge: 'Floor staff',
    location: 'Draft tables',
    tags: ['Limited', 'Beginner friendly', 'Packs included'],
  },
  {
    id: 'thu-modern',
    day: 'Thursday',
    startTime: '6:30 PM',
    endTime: '10:00 PM',
    title: 'Modern Weekly',
    format: 'Modern',
    audience: 'Competitive constructed',
    cost: 15,
    capacity: 36,
    seatsLeft: 11,
    rounds: '4 Swiss rounds, best of three',
    prize: '$10 store credit per match win, bonus promo for undefeated records',
    rules: [
      'Current Modern legality and official banned list apply.',
      'Companion and sideboard rules follow official tournament policy.',
      'Intentional draws allowed only before pairings are posted.',
    ],
    decklist: 'Required for top cut and store championship prep.',
    judge: 'Certified judge on site',
    location: 'Tournament tables',
    tags: ['Swiss', 'Competitive', 'Store credit'],
  },
  {
    id: 'fri-fnm-pioneer',
    day: 'Friday',
    startTime: '7:00 PM',
    endTime: '11:00 PM',
    title: 'Friday Night Magic Pioneer',
    format: 'Pioneer',
    audience: 'FNM regulars',
    cost: 12,
    capacity: 40,
    seatsLeft: 4,
    rounds: '4 Swiss rounds, best of three',
    prize: 'Pack-per-win, FNM promos, undefeated bonus',
    rules: [
      'Current Pioneer legality and official banned list apply.',
      'Late entry allowed until round two with round-one loss.',
      'Proxy cards are not permitted for sanctioned play.',
    ],
    decklist: 'Recommended for check-in speed. Required for RCQ practice nights.',
    judge: 'Store judge',
    location: 'Main play room',
    tags: ['FNM', 'Sanctioned', 'Low seats'],
  },
  {
    id: 'sat-rcq-prep',
    day: 'Saturday',
    startTime: '12:00 PM',
    endTime: '6:00 PM',
    title: 'RCQ Prep Event',
    format: 'Modern',
    audience: 'Competitive testing',
    cost: 25,
    capacity: 48,
    seatsLeft: 18,
    rounds: '5 Swiss rounds with optional top 8 practice cut',
    prize: 'Store credit scaling by record, premium promo pack to top 8',
    rules: [
      'Full decklist required before check-in closes.',
      'Competitive rules enforcement practice.',
      'Outside notes only between games.',
    ],
    decklist: 'Required. Submit 75-card list before checkout confirmation.',
    judge: 'Certified judge on site',
    location: 'Tournament hall',
    tags: ['RCQ prep', 'Decklist required', 'Top cut'],
  },
  {
    id: 'sun-family-commander',
    day: 'Sunday',
    startTime: '1:00 PM',
    endTime: '5:00 PM',
    title: 'Family Commander Open Play',
    format: 'Commander',
    audience: 'New players, families, and casual pods',
    cost: 5,
    capacity: 40,
    seatsLeft: 23,
    rounds: 'Open pods, staff rematch every 75 minutes',
    prize: 'Participation promo while supplies last',
    rules: [
      'Precons and upgraded precons welcome.',
      'Staff help with mulligans and table expectations.',
      'No prize points for wins.',
    ],
    decklist: 'Not required. Staff can help import a list into Mythivex.',
    judge: 'Store staff',
    location: 'Casual tables',
    tags: ['New player', 'Casual', 'Precon friendly'],
  },
]

function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function LgsEventsScheduler() {
  const [selectedDay, setSelectedDay] = useState<EventDay | 'All Week'>('All Week')
  const [selectedEventId, setSelectedEventId] = useState(events[0].id)
  const [tickets, setTickets] = useState(1)
  const [playerName, setPlayerName] = useState('')
  const [playerEmail, setPlayerEmail] = useState('')
  const [decklist, setDecklist] = useState('')
  const [confirmation, setConfirmation] = useState(false)

  const visibleEvents = useMemo(() => {
    if (selectedDay === 'All Week') return events
    return events.filter((event) => event.day === selectedDay)
  }, [selectedDay])

  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? events[0]
  const subtotal = selectedEvent.cost * tickets
  const serviceFee = Math.max(1, Math.round(subtotal * 0.06))
  const total = subtotal + serviceFee
  const requiresDecklist = selectedEvent.decklist.toLowerCase().includes('required')

  function handleDaySelect(day: EventDay | 'All Week') {
    setSelectedDay(day)
    const firstEvent = day === 'All Week' ? events[0] : events.find((event) => event.day === day)
    if (firstEvent) {
      setSelectedEventId(firstEvent.id)
    }
    setConfirmation(false)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setConfirmation(true)
  }

  return (
    <div className="min-h-screen bg-background">
      <section className="border-b border-border bg-secondary/25 pt-24">
        <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
                <CalendarDays className="h-4 w-4" />
                LGS Magic Schedule
              </div>
              <h1 className="mt-6 max-w-3xl text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                See what is playing, then reserve the seat.
              </h1>
              <p className="mt-5 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground">
                A store calendar for Magic events with formats, days, start times, costs, prize
                support, rounds, rules, decklist submission, signup, and checkout in one flow.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="h-12 min-w-[190px]" asChild>
                  <a href="#signup">
                    Sign up for an event
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button variant="outline" size="lg" className="h-12 min-w-[190px]" asChild>
                  <Link href="/for-stores">Store program</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Weekly events', value: events.length.toString(), icon: CalendarDays },
                { label: 'Formats shown', value: '5', icon: Sparkles },
                { label: 'Open seats', value: events.reduce((sum, event) => sum + event.seatsLeft, 0).toString(), icon: Users },
              ].map((stat) => {
                const Icon = stat.icon
                return (
                  <div key={stat.label} className="rounded-lg border border-border bg-card p-5">
                    <Icon className="h-5 w-5 text-primary" />
                    <p className="mt-4 text-3xl font-bold text-foreground">{stat.value}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.66fr_0.34fr] lg:px-8">
        <div className="space-y-6">
          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-max gap-2">
              {days.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDaySelect(day)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    selectedDay === day
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            {visibleEvents.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => {
                  setSelectedEventId(event.id)
                  setConfirmation(false)
                }}
                className={`rounded-lg border p-5 text-left transition-colors ${
                  selectedEventId === event.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:border-primary/45'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                        {event.day}
                      </span>
                      <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        {event.format}
                      </span>
                      {event.tags.map((tag) => (
                        <span key={tag} className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
                      {event.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{event.audience}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-foreground">{formatUsd(event.cost)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">entry</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-4">
                  {[
                    { icon: Clock3, label: 'Time', value: `${event.startTime} - ${event.endTime}` },
                    { icon: Users, label: 'Seats', value: `${event.seatsLeft}/${event.capacity} left` },
                    { icon: Trophy, label: 'Prize', value: event.prize },
                    { icon: ClipboardList, label: 'Rounds', value: event.rounds },
                  ].map((item) => {
                    const Icon = item.icon
                    return (
                      <div key={item.label} className="rounded-lg border border-border bg-background/50 p-3">
                        <Icon className="h-4 w-4 text-primary" />
                        <p className="mt-2 text-xs text-muted-foreground">{item.label}</p>
                        <p className="mt-1 text-sm font-medium leading-5 text-foreground">{item.value}</p>
                      </div>
                    )
                  })}
                </div>
              </button>
            ))}
          </div>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24">
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">{selectedEvent.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedEvent.day}, {selectedEvent.startTime} - {selectedEvent.endTime}
                </p>
              </div>
              <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {selectedEvent.format}
              </span>
            </div>

            <div className="mt-5 space-y-4">
              <div className="flex gap-3 rounded-lg border border-border bg-background/45 p-4">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">{selectedEvent.location}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{selectedEvent.judge}</p>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-background/45 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Rules and house rules
                </div>
                <ul className="mt-3 space-y-2">
                  {selectedEvent.rules.map((rule) => (
                    <li key={rule} className="flex gap-2 text-sm leading-6 text-muted-foreground">
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-3 rounded-lg border border-border bg-background/45 p-4">
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Decklist submission</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{selectedEvent.decklist}</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section id="signup" className="border-y border-border bg-secondary/30 py-12">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.62fr_0.38fr] lg:px-8">
          <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
                  <CreditCard className="h-4 w-4" />
                  Signup And Checkout
                </div>
                <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground">
                  Register for {selectedEvent.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Capture the player, ticket count, decklist, and checkout method before the store confirms the seat.
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background/50 px-4 py-3 text-right">
                <p className="text-xs text-muted-foreground">Selected event</p>
                <p className="mt-1 font-semibold text-foreground">
                  {selectedEvent.day} at {selectedEvent.startTime}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="playerName">Player name</Label>
                <Input
                  id="playerName"
                  value={playerName}
                  onChange={(event) => setPlayerName(event.target.value)}
                  placeholder="Alex Chen"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="playerEmail">Email</Label>
                <Input
                  id="playerEmail"
                  type="email"
                  value={playerEmail}
                  onChange={(event) => setPlayerEmail(event.target.value)}
                  placeholder="alex@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tickets">Seats</Label>
                <Input
                  id="tickets"
                  type="number"
                  min={1}
                  max={Math.min(4, selectedEvent.seatsLeft)}
                  value={tickets}
                  onChange={(event) => setTickets(Math.max(1, Number(event.target.value) || 1))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment">Checkout method</Label>
                <select
                  id="payment"
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  defaultValue="card"
                >
                  <option value="card">Pay by card now</option>
                  <option value="store-credit">Use store credit at check-in</option>
                  <option value="counter">Reserve and pay at counter</option>
                </select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="decklist">Decklist, companion, or notes</Label>
                <Textarea
                  id="decklist"
                  value={decklist}
                  onChange={(event) => setDecklist(event.target.value)}
                  placeholder="Paste a decklist, Moxfield link, commander, companion, or accessibility note."
                  required={requiresDecklist}
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  {requiresDecklist ? 'This event requires a decklist before registration can be confirmed.' : 'Decklist submission is optional for this event.'}
                </p>
              </div>
            </div>

            <Button type="submit" size="lg" className="mt-6 h-12 w-full sm:w-auto">
              Complete registration
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            {confirmation ? (
              <div className="mt-5 rounded-lg border border-primary/25 bg-primary/10 p-4 text-sm leading-6 text-foreground">
                <div className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold">Registration preview created.</p>
                    <p className="mt-1 text-muted-foreground">
                      {playerName || 'Player'} is queued for {tickets} seat{tickets === 1 ? '' : 's'} at {selectedEvent.title}. In production, this would hand off to payment capture and store roster confirmation.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </form>

          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <DollarSign className="h-4 w-4 text-primary" />
              Checkout summary
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">{selectedEvent.title}</span>
                <span className="font-medium text-foreground">{formatUsd(selectedEvent.cost)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Seats</span>
                <span className="font-medium text-foreground">x{tickets}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Registration fee</span>
                <span className="font-medium text-foreground">{formatUsd(serviceFee)}</span>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex justify-between gap-4 text-base">
                  <span className="font-semibold text-foreground">Total due</span>
                  <span className="font-bold text-foreground">{formatUsd(total)}</span>
                </div>
              </div>
            </div>
            <div className="mt-6 rounded-lg border border-border bg-background/45 p-4">
              <p className="text-sm font-medium text-foreground">Prize support</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{selectedEvent.prize}</p>
            </div>
            <div className="mt-4 rounded-lg border border-border bg-background/45 p-4">
              <p className="text-sm font-medium text-foreground">Store roster output</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Confirmation writes the player to the event roster, captures decklist status, reserves the seat, and makes the entry available for PodMatch or tournament pairings.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
