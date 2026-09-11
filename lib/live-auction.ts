// Mythivex Live: a 24/7 simulated live-commerce auction broadcast.
//
// The whole channel is a pure function of wall-clock time. Time is divided
// into fixed-length lot slots; each slot's card, bid timeline, and the
// barker/commentator script are derived from a PRNG seeded by the slot index.
// Every visitor therefore sees the exact same "broadcast" at the same moment
// with no server, no websockets, and no scheduler.
//
// Bids and bidders are simulated and the UI must say so. Real auctions live
// at /auctions on the auction_listings schema.

import { auctionMinimumIncrement } from '@/lib/auction/foundation'

export const LOT_SECONDS = 90

const BIDDING_OPENS_SEC = 12
const BIDDING_CLOSES_SEC = LOT_SECONDS - 16
const GOING_ONCE_SEC = LOT_SECONDS - 14
const GOING_TWICE_SEC = LOT_SECONDS - 8
const SOLD_SEC = LOT_SECONDS - 3

export type LotTier = 'budget' | 'staple' | 'chase' | 'grail'

export type LiveLotCard = {
  name: string
  setName: string
  rarity: 'common' | 'uncommon' | 'rare' | 'mythic'
  finish: 'nonfoil' | 'foil' | 'etched'
  condition: 'NM' | 'LP' | 'MP'
  estValueUsd: number
  tier: LotTier
  blurb: string
}

export type LiveShow = {
  key: string
  name: string
  tagline: string
  /** UTC hours this show is on air (24/7 grid; every hour maps to one show). */
  hoursUtc: number[]
  tiers: LotTier[]
  barker: string
  commentators: [string, string]
  baseViewers: number
}

export type LiveEventKind = 'barker' | 'commentary' | 'bid' | 'hammer' | 'sold'

export type LiveEvent = {
  atSec: number
  kind: LiveEventKind
  speaker: string
  text: string
  amountUsd?: number
  bidder?: string
}

export type LotScript = {
  slotIndex: number
  show: LiveShow
  lot: LiveLotCard
  openingBidUsd: number
  soldPriceUsd: number
  winningBidder: string
  events: LiveEvent[]
}

export type BroadcastPhase = 'preview' | 'bidding' | 'hammer' | 'sold'

export type BroadcastState = {
  slotIndex: number
  show: LiveShow
  lot: LiveLotCard
  secondsIntoLot: number
  secondsRemaining: number
  phase: BroadcastPhase
  currentPriceUsd: number
  leadingBidder: string | null
  visibleEvents: LiveEvent[]
  script: LotScript
  nextLot: LiveLotCard
  viewerCount: number
  upNext: { show: LiveShow; startsAtUtcHour: number }[]
}

// --- Cast -------------------------------------------------------------------

const BIDDER_HANDLES = [
  'DragonHoard_88',
  'TopdeckTina',
  'MoxRuby*Rob',
  'GraveTitanGail',
  'CurveOutCarl',
  'FoilFiend_yyz',
  'StormCount9',
  'BinderKing_Lou',
  'MulliganMaeve',
  'CommandZoneCody',
  'WheelerDealer_5c',
  'ProxyNeverPam',
]

// --- Programming grid (24/7, keyed by UTC hour) ------------------------------

export const LIVE_SHOWS: LiveShow[] = [
  {
    key: 'midnight-mythics',
    name: 'Midnight Mythics',
    tagline: 'High-end pieces for night owls with deep sleeves.',
    hoursUtc: [0, 1, 2, 3],
    tiers: ['chase', 'grail'],
    barker: "Sonny 'The Gavel' Marlowe",
    commentators: ['Prof. Petra Wildcard', 'Big Mike Mulligan'],
    baseViewers: 412,
  },
  {
    key: 'graveyard-grabs',
    name: 'Graveyard Shift Grabs',
    tagline: 'Budget bangers and bulk-bin heroes, rapid fire.',
    hoursUtc: [4, 5, 6, 7],
    tiers: ['budget', 'staple'],
    barker: 'Rex Ricochet',
    commentators: ['Big Mike Mulligan', 'Lady Loam'],
    baseViewers: 188,
  },
  {
    key: 'morning-movers',
    name: 'Morning Movers',
    tagline: 'The staples everyone plays, before your coffee cools.',
    hoursUtc: [8, 9, 10, 11],
    tiers: ['staple', 'chase'],
    barker: 'Dot Dashwood',
    commentators: ['Prof. Petra Wildcard', 'Sideboard Sal'],
    baseViewers: 356,
  },
  {
    key: 'lunch-rush-lots',
    name: 'Lunch Rush Lots',
    tagline: 'A little of everything while you eat at your desk.',
    hoursUtc: [12, 13, 14, 15],
    tiers: ['budget', 'staple', 'chase'],
    barker: 'Rex Ricochet',
    commentators: ['Sideboard Sal', 'Lady Loam'],
    baseViewers: 501,
  },
  {
    key: 'prime-time-power',
    name: 'Prime Time Power',
    tagline: 'Chase cards and bidding wars under the bright lights.',
    hoursUtc: [16, 17, 18, 19],
    tiers: ['chase', 'grail'],
    barker: "Sonny 'The Gavel' Marlowe",
    commentators: ['Prof. Petra Wildcard', 'Big Mike Mulligan'],
    baseViewers: 947,
  },
  {
    key: 'evening-showcase',
    name: 'Evening Showcase',
    tagline: 'Foils, etched frames, and collector-grade shine.',
    hoursUtc: [20, 21, 22, 23],
    tiers: ['staple', 'chase', 'grail'],
    barker: 'Dot Dashwood',
    commentators: ['Lady Loam', 'Sideboard Sal'],
    baseViewers: 733,
  },
]

// --- Lot pool ----------------------------------------------------------------

export const LIVE_LOT_POOL: LiveLotCard[] = [
  { name: 'Lightning Bolt', setName: 'Ravnica: Clue Edition', rarity: 'uncommon', finish: 'nonfoil', condition: 'NM', estValueUsd: 3, tier: 'budget', blurb: 'Three damage, one mana, zero excuses.' },
  { name: 'Sol Ring', setName: 'Commander Masters', rarity: 'uncommon', finish: 'nonfoil', condition: 'NM', estValueUsd: 2, tier: 'budget', blurb: 'The most-played card in the format. Someone always needs another.' },
  { name: 'Counterspell', setName: 'Modern Horizons 2', rarity: 'common', finish: 'foil', condition: 'NM', estValueUsd: 4, tier: 'budget', blurb: 'A shiny "no" for the blue mage in your pod.' },
  { name: 'Swords to Plowshares', setName: 'Strixhaven Mystical Archive', rarity: 'uncommon', finish: 'foil', condition: 'NM', estValueUsd: 6, tier: 'budget', blurb: 'Archive frame, archive rate. Exile is forever.' },
  { name: 'Cultivate', setName: 'Core Set 2021', rarity: 'uncommon', finish: 'nonfoil', condition: 'NM', estValueUsd: 2, tier: 'budget', blurb: 'Ramp that never goes out of style.' },
  { name: 'Path to Exile', setName: 'Conflux', rarity: 'uncommon', finish: 'nonfoil', condition: 'LP', estValueUsd: 5, tier: 'budget', blurb: 'Original printing, lightly loved.' },
  { name: 'Rhystic Study', setName: 'Prophecy', rarity: 'common', finish: 'nonfoil', condition: 'LP', estValueUsd: 38, tier: 'staple', blurb: 'Did you pay the one? The card that asks the question.' },
  { name: 'Smothering Tithe', setName: 'Ravnica Allegiance', rarity: 'rare', finish: 'nonfoil', condition: 'NM', estValueUsd: 32, tier: 'staple', blurb: 'White ramp is real and it collects rent.' },
  { name: 'Cyclonic Rift', setName: 'Return to Ravnica', rarity: 'rare', finish: 'nonfoil', condition: 'NM', estValueUsd: 28, tier: 'staple', blurb: 'One-sided board reset. Groans included free.' },
  { name: 'Demonic Tutor', setName: 'Strixhaven Mystical Archive', rarity: 'mythic', finish: 'nonfoil', condition: 'NM', estValueUsd: 42, tier: 'staple', blurb: 'Any card in your library. Yes, that one.' },
  { name: 'Dockside Extortionist', setName: 'Commander 2019', rarity: 'rare', finish: 'nonfoil', condition: 'NM', estValueUsd: 45, tier: 'staple', blurb: 'The goblin that pays for himself, several times over.' },
  { name: 'Fierce Guardianship', setName: 'Commander 2020', rarity: 'rare', finish: 'nonfoil', condition: 'NM', estValueUsd: 34, tier: 'staple', blurb: 'Free counterspells make fast friends.' },
  { name: 'Teferi, Time Raveler', setName: 'War of the Spark', rarity: 'rare', finish: 'nonfoil', condition: 'NM', estValueUsd: 18, tier: 'staple', blurb: 'The three-mana rules committee.' },
  { name: 'The One Ring', setName: 'Tales of Middle-earth', rarity: 'mythic', finish: 'nonfoil', condition: 'NM', estValueUsd: 58, tier: 'chase', blurb: 'Precious card advantage, burden included.' },
  { name: 'Ragavan, Nimble Pilferer', setName: 'Modern Horizons 2', rarity: 'mythic', finish: 'nonfoil', condition: 'NM', estValueUsd: 62, tier: 'chase', blurb: 'One monkey, one dagger, one format warped.' },
  { name: 'Force of Will', setName: 'Eternal Masters', rarity: 'mythic', finish: 'nonfoil', condition: 'NM', estValueUsd: 78, tier: 'chase', blurb: 'The pitch counter that defines eternal Magic.' },
  { name: 'Mana Drain', setName: 'Iconic Masters', rarity: 'mythic', finish: 'nonfoil', condition: 'NM', estValueUsd: 65, tier: 'chase', blurb: 'Counter theirs, cast yours with the change.' },
  { name: 'Wrenn and Six', setName: 'Modern Horizons', rarity: 'mythic', finish: 'nonfoil', condition: 'NM', estValueUsd: 55, tier: 'chase', blurb: 'Two loyalty a turn, lands forever.' },
  { name: 'Jeweled Lotus', setName: 'Commander Legends', rarity: 'mythic', finish: 'nonfoil', condition: 'NM', estValueUsd: 88, tier: 'chase', blurb: 'Three mana of pure commander fuel.' },
  { name: 'Sheoldred, the Apocalypse', setName: 'Dominaria United', rarity: 'mythic', finish: 'foil', condition: 'NM', estValueUsd: 96, tier: 'chase', blurb: 'Draw a card, lose two life, lose the game.' },
  { name: 'Mana Crypt', setName: 'Eternal Masters', rarity: 'mythic', finish: 'nonfoil', condition: 'NM', estValueUsd: 180, tier: 'grail', blurb: 'Zero-cost acceleration with a coin-flip heartbeat.' },
  { name: 'Gaea’s Cradle', setName: 'Urza’s Saga', rarity: 'rare', finish: 'nonfoil', condition: 'LP', estValueUsd: 890, tier: 'grail', blurb: 'The land that turns creatures into mana. Reserved List royalty.' },
  { name: 'Mox Diamond', setName: 'Stronghold', rarity: 'rare', finish: 'nonfoil', condition: 'MP', estValueUsd: 420, tier: 'grail', blurb: 'A Mox with a land tax. Played, but proud.' },
  { name: 'Force of Will', setName: 'Alliances', rarity: 'uncommon', finish: 'nonfoil', condition: 'LP', estValueUsd: 110, tier: 'grail', blurb: 'The original art, the original pitch.' },
  { name: 'The Great Henge', setName: 'Throne of Eldraine', rarity: 'mythic', finish: 'foil', condition: 'NM', estValueUsd: 120, tier: 'grail', blurb: 'Stompy decks’ favorite monument, in foil.' },
  { name: 'Lion’s Eye Diamond', setName: 'Mirage', rarity: 'rare', finish: 'nonfoil', condition: 'LP', estValueUsd: 310, tier: 'grail', blurb: 'The worst fair card, the best unfair one.' },
]

// --- Seeded RNG ---------------------------------------------------------------

function mulberry32(seed: number) {
  let a = seed >>> 0
  return function next() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length) % items.length]
}

// --- Schedule ------------------------------------------------------------------

export function slotIndexAt(nowMs: number): number {
  return Math.floor(nowMs / 1000 / LOT_SECONDS)
}

export function slotStartMs(slotIndex: number): number {
  return slotIndex * LOT_SECONDS * 1000
}

export function showForHourUtc(hour: number): LiveShow {
  const show = LIVE_SHOWS.find((s) => s.hoursUtc.includes(((hour % 24) + 24) % 24))
  // The grid covers all 24 hours; this fallback is for safety only.
  return show ?? LIVE_SHOWS[0]
}

export function showForSlot(slotIndex: number): LiveShow {
  return showForHourUtc(new Date(slotStartMs(slotIndex)).getUTCHours())
}

function poolForShow(show: LiveShow): LiveLotCard[] {
  return LIVE_LOT_POOL.filter((card) => show.tiers.includes(card.tier))
}

function rawLotIndex(slotIndex: number, poolLength: number): number {
  const rng = mulberry32(slotIndex * 2654435761)
  return Math.floor(rng() * poolLength) % poolLength
}

export function lotForSlot(slotIndex: number): LiveLotCard {
  const show = showForSlot(slotIndex)
  const pool = poolForShow(show)

  // Never auction the identical lot twice in a row within one show. Bumping a
  // colliding pick changes the "previous lot" that the next slot must dodge,
  // so replay the bump chain from the start of the show block (a block is a
  // few hours of 90-second slots; the walk is short and pure).
  let blockStart = slotIndex
  while (slotIndex - blockStart < 400 && showForSlot(blockStart - 1).key === show.key) {
    blockStart--
  }

  let index = rawLotIndex(blockStart, pool.length)
  for (let slot = blockStart + 1; slot <= slotIndex; slot++) {
    const raw = rawLotIndex(slot, pool.length)
    index = raw === index ? (raw + 1) % pool.length : raw
  }

  return pool[index]
}

// --- Script generation -----------------------------------------------------------

function roundOpeningBid(value: number) {
  // Cheap lots open on whole dollars; anything else snaps to the $5 grid.
  if (value < 5) return Math.max(1, Math.round(value))
  return Math.round(value / 5) * 5
}

const BARKER_INTROS = [
  'Folks, folks, FOLKS — look what just hit the table: {card}!',
  'Next lot, no waiting! Fresh out of the vault, it’s {card}!',
  'You asked for it, you got it — {card} is LIVE on the block!',
  'Hold onto your sleeves, because {card} just walked on stage!',
]

const BARKER_DESCRIBES = [
  '{set}, {condition}, {finish} — book says {est}, but the book doesn’t bid, YOU do!',
  'That’s a {condition} copy from {set}. Comps around {est} — tonight it goes where the paddles say!',
  'Straight from {set}, graded eyes-on at {condition}. Sheet value {est} — let’s find out what it’s really worth!',
]

const BARKER_OPENS = [
  'We open the floor at {open} — who wants it? Don’t be shy!',
  'Bidding starts at {open}! Paddle up, chat, paddle UP!',
  'I need {open} to get this party started — {open}, anyone!',
]

const BARKER_BID_CALLS = [
  '{amount} from {bidder}! Do I hear more?',
  '{bidder} says {amount}! Who’s got the stones to top it?',
  'BANG — {amount} on the board from {bidder}!',
  '{amount}! {bidder} wants it BAD, folks!',
  'New money! {bidder} steps in at {amount}!',
]

const COMMENTARY_COLOR = [
  'This printing has been quietly climbing for weeks — sharp lot to watch.',
  'I pulled one of these at my LGS in ’19 and I still brag about it.',
  'Condition is everything on this one. That {condition} grade is honest.',
  'Chat is already fired up — the emote wall is pure gasoline right now.',
  'If this stays under book, somebody is stealing dinner tonight.',
]

const COMMENTARY_MILESTONE = [
  'And there it goes — we are OVER book value. This is a want, not a need!',
  'Past the comp sheet! Two bidders who both refuse to eat a loss, I love it.',
  'That escalated fast. Somebody’s spouse is going to see this statement.',
]

const COMMENTARY_WAR = [
  'Bid war! These two have been trading haymakers all segment!',
  'They’re not even breathing between bids now. Personal.',
  'This is why we broadcast at this hour, folks. Pure theater.',
]

const BARKER_GOING_ONCE = [
  'Going ONCE at {amount}! Speak now, chat!',
  'Fair warning — {amount} going once! Don’t you dare let it slip!',
]

const BARKER_GOING_TWICE = [
  'Going TWICE at {amount}! Last call, last chance!',
  'Twice! {amount}! I can’t hold the hammer forever, people!',
]

const BARKER_SOLD = [
  'SOLD! {amount} to {bidder}! Somebody ring the bell!',
  'HAMMER DOWN! {amount}, and {bidder} takes it home!',
  'SOLD to {bidder} for {amount}! What a way to close the lot!',
]

export function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? `{${key}}`)
}

export function buildLotScript(slotIndex: number): LotScript {
  const show = showForSlot(slotIndex)
  const lot = lotForSlot(slotIndex)
  const rng = mulberry32(slotIndex * 747796405 + 11)

  const openingBidUsd = roundOpeningBid(lot.estValueUsd * (0.35 + rng() * 0.15))
  const est = formatUsd(lot.estValueUsd)
  const open = formatUsd(openingBidUsd)
  const [colorCaster, analystCaster] = show.commentators

  const events: LiveEvent[] = []

  events.push({
    atSec: 0,
    kind: 'barker',
    speaker: show.barker,
    text: fill(pick(rng, BARKER_INTROS), { card: lot.name }),
  })
  events.push({
    atSec: 4,
    kind: 'barker',
    speaker: show.barker,
    text: fill(pick(rng, BARKER_DESCRIBES), {
      set: lot.setName,
      condition: lot.condition,
      finish: lot.finish === 'nonfoil' ? 'non-foil' : lot.finish,
      est,
    }),
  })
  events.push({
    atSec: 8,
    kind: 'commentary',
    speaker: colorCaster,
    text: fill(pick(rng, COMMENTARY_COLOR), { condition: lot.condition }),
  })
  events.push({
    atSec: BIDDING_OPENS_SEC,
    kind: 'barker',
    speaker: show.barker,
    text: fill(pick(rng, BARKER_OPENS), { open }),
  })

  // Simulated bid timeline: 4-9 bids spaced through the bidding window,
  // each respecting the marketplace's real minimum-increment ladder.
  const bidCount = 4 + Math.floor(rng() * 6)
  const bidderCount = 3 + Math.floor(rng() * 3)
  const bidders: string[] = []
  while (bidders.length < bidderCount) {
    const handle = pick(rng, BIDDER_HANDLES)
    if (!bidders.includes(handle)) bidders.push(handle)
  }

  const window = BIDDING_CLOSES_SEC - BIDDING_OPENS_SEC - 4
  let amount = openingBidUsd
  let lastBidder = ''
  let milestoneDone = false
  let warDone = false
  let prevBidAt = BIDDING_OPENS_SEC + 2

  for (let i = 0; i < bidCount; i++) {
    const atSec = BIDDING_OPENS_SEC + 3 + Math.floor((window * (i + rng() * 0.8)) / bidCount)
    const increment = auctionMinimumIncrement(amount)
    const jump = rng() < 0.18 ? 1 + Math.floor(rng() * 2) : 0
    amount = i === 0 ? amount : amount + increment * (1 + jump)

    let bidder = pick(rng, bidders)
    if (bidder === lastBidder) bidder = bidders[(bidders.indexOf(bidder) + 1) % bidders.length]
    lastBidder = bidder

    events.push({
      atSec,
      kind: 'bid',
      speaker: show.barker,
      text: fill(pick(rng, BARKER_BID_CALLS), { amount: formatUsd(amount), bidder }),
      amountUsd: amount,
      bidder,
    })

    if (!milestoneDone && amount > lot.estValueUsd) {
      milestoneDone = true
      events.push({
        atSec: atSec + 1.5,
        kind: 'commentary',
        speaker: analystCaster,
        text: pick(rng, COMMENTARY_MILESTONE),
      })
    } else if (!warDone && i >= 2 && atSec - prevBidAt <= 6) {
      warDone = true
      events.push({
        atSec: atSec + 1.5,
        kind: 'commentary',
        speaker: colorCaster,
        text: pick(rng, COMMENTARY_WAR),
      })
    }

    prevBidAt = atSec
  }

  const soldAmount = formatUsd(amount)
  events.push({
    atSec: GOING_ONCE_SEC,
    kind: 'hammer',
    speaker: show.barker,
    text: fill(pick(rng, BARKER_GOING_ONCE), { amount: soldAmount }),
  })
  events.push({
    atSec: GOING_TWICE_SEC,
    kind: 'hammer',
    speaker: show.barker,
    text: fill(pick(rng, BARKER_GOING_TWICE), { amount: soldAmount }),
  })
  events.push({
    atSec: SOLD_SEC,
    kind: 'sold',
    speaker: show.barker,
    text: fill(pick(rng, BARKER_SOLD), { amount: soldAmount, bidder: lastBidder }),
    amountUsd: amount,
    bidder: lastBidder,
  })

  events.sort((a, b) => a.atSec - b.atSec)

  return {
    slotIndex,
    show,
    lot,
    openingBidUsd,
    soldPriceUsd: amount,
    winningBidder: lastBidder,
    events,
  }
}

// --- Broadcast state ---------------------------------------------------------------

export function viewerCountAt(nowMs: number): number {
  const slotIndex = slotIndexAt(nowMs)
  const show = showForSlot(slotIndex)
  const rng = mulberry32(slotIndex * 1597334677 + 7)
  const dayWave = Math.sin((nowMs / 86_400_000) * Math.PI * 2) * 0.12
  const lotWave = Math.sin(((nowMs / 1000) % LOT_SECONDS) / LOT_SECONDS * Math.PI) * 0.08
  const noise = (rng() - 0.5) * 0.1
  return Math.max(25, Math.round(show.baseViewers * (1 + dayWave + lotWave + noise)))
}

export function phaseAt(secondsIntoLot: number): BroadcastPhase {
  if (secondsIntoLot < BIDDING_OPENS_SEC) return 'preview'
  if (secondsIntoLot < GOING_ONCE_SEC) return 'bidding'
  if (secondsIntoLot < SOLD_SEC) return 'hammer'
  return 'sold'
}

export function getBroadcastState(nowMs: number): BroadcastState {
  const slotIndex = slotIndexAt(nowMs)
  const secondsIntoLot = Math.floor((nowMs - slotStartMs(slotIndex)) / 1000)
  const script = buildLotScript(slotIndex)
  const visibleEvents = script.events.filter((event) => event.atSec <= secondsIntoLot)

  let currentPriceUsd = script.openingBidUsd
  let leadingBidder: string | null = null
  for (const event of visibleEvents) {
    if (event.amountUsd != null) {
      currentPriceUsd = event.amountUsd
      leadingBidder = event.bidder ?? leadingBidder
    }
  }

  const currentHour = new Date(nowMs).getUTCHours()
  const currentShow = script.show
  const upNext: { show: LiveShow; startsAtUtcHour: number }[] = []
  let lastKey = currentShow.key
  for (let offset = 1; offset <= 24 && upNext.length < 3; offset++) {
    const hour = (currentHour + offset) % 24
    const show = showForHourUtc(hour)
    if (show.key !== lastKey) {
      upNext.push({ show, startsAtUtcHour: hour })
      lastKey = show.key
    }
  }

  return {
    slotIndex,
    show: currentShow,
    lot: script.lot,
    secondsIntoLot,
    secondsRemaining: LOT_SECONDS - secondsIntoLot,
    phase: phaseAt(secondsIntoLot),
    currentPriceUsd,
    leadingBidder,
    visibleEvents,
    script,
    nextLot: lotForSlot(slotIndex + 1),
    viewerCount: viewerCountAt(nowMs),
    upNext,
  }
}
