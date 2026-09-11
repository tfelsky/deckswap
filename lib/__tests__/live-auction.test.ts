import { describe, expect, it } from 'vitest'
import { auctionMinimumIncrement } from '@/lib/auction/foundation'
import {
  LIVE_LOT_POOL,
  LIVE_SHOWS,
  LOT_SECONDS,
  buildLotScript,
  getBroadcastState,
  lotForSlot,
  phaseAt,
  showForHourUtc,
  showForSlot,
  slotIndexAt,
  slotStartMs,
  viewerCountAt,
} from '@/lib/live-auction'

const SAMPLE_SLOTS = [0, 1, 999, 123456, 20260705, 987654321]

describe('programming grid', () => {
  it('covers every UTC hour with exactly one show', () => {
    for (let hour = 0; hour < 24; hour++) {
      const shows = LIVE_SHOWS.filter((show) => show.hoursUtc.includes(hour))
      expect(shows).toHaveLength(1)
    }
  })

  it('every show has at least two lots available in its tier pool', () => {
    for (const show of LIVE_SHOWS) {
      const pool = LIVE_LOT_POOL.filter((card) => show.tiers.includes(card.tier))
      expect(pool.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('assigns slots to the show that owns the slot-start hour', () => {
    for (const slot of SAMPLE_SLOTS) {
      const hour = new Date(slotStartMs(slot)).getUTCHours()
      expect(showForSlot(slot).key).toBe(showForHourUtc(hour).key)
    }
  })
})

describe('slot schedule', () => {
  it('maps time to consecutive fixed-length slots', () => {
    const t = Date.UTC(2026, 6, 5, 18, 30, 0)
    const slot = slotIndexAt(t)
    expect(slotIndexAt(t + LOT_SECONDS * 1000)).toBe(slot + 1)
    expect(slotStartMs(slot)).toBeLessThanOrEqual(t)
    expect(slotStartMs(slot + 1)).toBeGreaterThan(t)
  })

  it('never auctions the identical lot twice in a row within one show', () => {
    // Slots within the same UTC hour always share a show.
    const base = slotIndexAt(Date.UTC(2026, 6, 5, 17, 0, 0))
    for (let i = 0; i < 30; i++) {
      const a = lotForSlot(base + i)
      const b = lotForSlot(base + i + 1)
      if (showForSlot(base + i).key === showForSlot(base + i + 1).key) {
        expect(`${a.name}|${a.setName}|${a.finish}`).not.toBe(`${b.name}|${b.setName}|${b.finish}`)
      }
    }
  })
})

describe('buildLotScript', () => {
  it('is deterministic for a given slot', () => {
    for (const slot of SAMPLE_SLOTS) {
      expect(buildLotScript(slot)).toEqual(buildLotScript(slot))
    }
  })

  it('produces events sorted within the lot window, ending with SOLD', () => {
    for (const slot of SAMPLE_SLOTS) {
      const script = buildLotScript(slot)
      let prev = -1
      for (const event of script.events) {
        expect(event.atSec).toBeGreaterThanOrEqual(prev)
        expect(event.atSec).toBeGreaterThanOrEqual(0)
        expect(event.atSec).toBeLessThan(LOT_SECONDS)
        prev = event.atSec
      }
      const last = script.events[script.events.length - 1]
      expect(last.kind).toBe('sold')
      expect(last.amountUsd).toBe(script.soldPriceUsd)
      expect(last.bidder).toBe(script.winningBidder)
    }
  })

  it('bids rise monotonically and respect the marketplace increment ladder', () => {
    for (const slot of SAMPLE_SLOTS) {
      const script = buildLotScript(slot)
      const bids = script.events.filter((event) => event.kind === 'bid')
      expect(bids.length).toBeGreaterThanOrEqual(4)

      expect(bids[0].amountUsd).toBe(script.openingBidUsd)
      for (let i = 1; i < bids.length; i++) {
        const prevAmount = bids[i - 1].amountUsd!
        expect(bids[i].amountUsd!).toBeGreaterThanOrEqual(
          prevAmount + auctionMinimumIncrement(prevAmount)
        )
      }
    }
  })

  it('never lets a bidder outbid themselves', () => {
    for (const slot of SAMPLE_SLOTS) {
      const bids = buildLotScript(slot).events.filter((event) => event.kind === 'bid')
      for (let i = 1; i < bids.length; i++) {
        expect(bids[i].bidder).not.toBe(bids[i - 1].bidder)
      }
    }
  })

  it('opens below estimated value and interpolates every template variable', () => {
    for (const slot of SAMPLE_SLOTS) {
      const script = buildLotScript(slot)
      expect(script.openingBidUsd).toBeLessThan(Math.max(script.lot.estValueUsd, 2))
      for (const event of script.events) {
        expect(event.text).not.toMatch(/\{\w+\}/)
      }
    }
  })
})

describe('getBroadcastState', () => {
  it('reveals events progressively and tracks the leading bid', () => {
    const slot = 20260705
    const start = slotStartMs(slot)
    const script = buildLotScript(slot)

    const early = getBroadcastState(start + 1000)
    expect(early.phase).toBe('preview')
    expect(early.leadingBidder).toBeNull()
    expect(early.currentPriceUsd).toBe(script.openingBidUsd)

    const late = getBroadcastState(start + (LOT_SECONDS - 1) * 1000)
    expect(late.phase).toBe('sold')
    expect(late.currentPriceUsd).toBe(script.soldPriceUsd)
    expect(late.leadingBidder).toBe(script.winningBidder)
    expect(late.visibleEvents.length).toBe(script.events.length)
  })

  it('advances through preview, bidding, hammer, and sold phases', () => {
    expect(phaseAt(0)).toBe('preview')
    expect(phaseAt(30)).toBe('bidding')
    expect(phaseAt(LOT_SECONDS - 10)).toBe('hammer')
    expect(phaseAt(LOT_SECONDS - 1)).toBe('sold')
  })

  it('offers a next-lot preview and an up-next guide of other shows', () => {
    const state = getBroadcastState(Date.UTC(2026, 6, 5, 18, 45, 12))
    expect(state.nextLot.name).toBeTruthy()
    expect(state.upNext.length).toBeGreaterThanOrEqual(1)
    for (const entry of state.upNext) {
      expect(entry.show.key).not.toBe(state.show.key)
    }
  })

  it('reports a deterministic, positive viewer count', () => {
    const t = Date.UTC(2026, 6, 5, 3, 12, 9)
    expect(viewerCountAt(t)).toBe(viewerCountAt(t))
    expect(viewerCountAt(t)).toBeGreaterThan(0)
  })
})
