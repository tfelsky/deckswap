import { describe, expect, it } from 'vitest'
import {
  MAIL_SLOT,
  calculateMailSlotRentUsd,
  calculateMailSlotShipping,
  estimateMailSlotSavings,
  holdWeekChoices,
  isMailSlotsSchemaMissing,
  quoteQueuedCheckout,
  remainingHoldWeeks,
  resolveMailSlotPhase,
} from '@/lib/singles/mail-slots'
import { calculateSinglesPricingBreakdown } from '@/lib/singles/pricing'

const NOW = new Date('2026-09-10T12:00:00Z')
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

function slotWindow(openedAt: Date, paidWeeks: number) {
  return {
    held_until: new Date(openedAt.getTime() + paidWeeks * WEEK_MS).toISOString(),
    max_hold_until: new Date(openedAt.getTime() + MAIL_SLOT.maxHoldWeeks * WEEK_MS).toISOString(),
  }
}

describe('calculateMailSlotRentUsd', () => {
  it('charges the weekly rate per whole week', () => {
    expect(calculateMailSlotRentUsd(4)).toBe(4)
    expect(calculateMailSlotRentUsd(2.9)).toBe(2)
  })

  it('never charges for nonsense input', () => {
    expect(calculateMailSlotRentUsd(-3)).toBe(0)
    expect(calculateMailSlotRentUsd(Number.NaN)).toBe(0)
  })
})

describe('remainingHoldWeeks', () => {
  it('counts whole weeks left before the cap', () => {
    expect(remainingHoldWeeks(slotWindow(NOW, 4), NOW)).toBe(9)
  })

  it('restarts from today once a hold has lapsed', () => {
    // Opened 6 weeks ago with 2 weeks paid: lapsed for 4 weeks, 7 left before the cap.
    const openedAt = new Date(NOW.getTime() - 6 * WEEK_MS)
    expect(remainingHoldWeeks(slotWindow(openedAt, 2), NOW)).toBe(7)
  })

  it('is zero at the cap', () => {
    expect(remainingHoldWeeks(slotWindow(NOW, MAIL_SLOT.maxHoldWeeks), NOW)).toBe(0)
  })
})

describe('holdWeekChoices', () => {
  it('offers the standard ladder for a new slot', () => {
    expect(holdWeekChoices(null, NOW)).toEqual([1, 2, 4, 8, 13])
  })

  it('lets an open slot be joined as-is, extended, or topped out', () => {
    expect(holdWeekChoices(slotWindow(NOW, 4), NOW)).toEqual([0, 1, 2, 4, 8, 9])
  })

  it('only offers joining once a slot is maxed out', () => {
    expect(holdWeekChoices(slotWindow(NOW, MAIL_SLOT.maxHoldWeeks), NOW)).toEqual([0])
  })
})

describe('resolveMailSlotPhase', () => {
  it('splits an open slot into holding and hold-ended', () => {
    const later = new Date(NOW.getTime() + WEEK_MS).toISOString()
    const earlier = new Date(NOW.getTime() - 1000).toISOString()

    expect(resolveMailSlotPhase({ status: 'open', held_until: later }, NOW)).toBe('holding')
    expect(resolveMailSlotPhase({ status: 'open', held_until: earlier }, NOW)).toBe('hold_ended')
  })

  it('passes settled statuses through', () => {
    expect(resolveMailSlotPhase({ status: 'shipped', held_until: NOW.toISOString() }, NOW)).toBe('shipped')
  })
})

describe('calculateMailSlotShipping', () => {
  it('ships a small slot in one PWE', () => {
    const shipping = calculateMailSlotShipping([
      { item_subtotal_usd: 12, item_count: 3 },
      { item_subtotal_usd: 12, item_count: 3 },
    ])

    expect(shipping).toMatchObject({ subtotal: 24, itemCount: 6, method: 'pwe_untracked', amount: 5 })
  })

  it('upgrades to a tracked mailer once the combined slot crosses $30', () => {
    const shipping = calculateMailSlotShipping([
      { item_subtotal_usd: 12, item_count: 3 },
      { item_subtotal_usd: 12, item_count: 3 },
      { item_subtotal_usd: 12, item_count: 3 },
    ])

    expect(shipping).toMatchObject({ subtotal: 36, method: 'tracked_padded_mailer', amount: 15 })
  })
})

describe('estimateMailSlotSavings', () => {
  it('pays off for many small orders', () => {
    // Ten $3 one-card orders: ten $5 PWEs apart, one $5 PWE together, $4 rent.
    const orders = Array.from({ length: 10 }, () => ({ item_subtotal_usd: 3, item_count: 1 }))

    expect(estimateMailSlotSavings({ orders, rentPaidUsd: 4 })).toEqual({
      separateShippingUsd: 50,
      combinedShippingUsd: 5,
      rentPaidUsd: 4,
      netSavingsUsd: 41,
    })
  })

  it('reports a loss when one order is held on its own', () => {
    const savings = estimateMailSlotSavings({
      orders: [{ item_subtotal_usd: 10, item_count: 1 }],
      rentPaidUsd: 4,
    })

    expect(savings.netSavingsUsd).toBe(-4)
  })

  it('uses the charged shipping once the slot has been released', () => {
    const savings = estimateMailSlotSavings({
      orders: [
        { item_subtotal_usd: 20, item_count: 2 },
        { item_subtotal_usd: 20, item_count: 2 },
      ],
      rentPaidUsd: 2,
      combinedShippingUsd: 15,
    })

    expect(savings).toMatchObject({ separateShippingUsd: 10, combinedShippingUsd: 15, netSavingsUsd: -7 })
  })
})

describe('quoteQueuedCheckout', () => {
  // $40 across 4 cards: no volume discount, a $15 tracked mailer if shipped now.
  const pricing = calculateSinglesPricingBreakdown(40, 4)

  it('opens a new slot: drops the shipping and adds rent', () => {
    const quote = quoteQueuedCheckout({ pricing, holdWeeks: 4, now: NOW })

    expect(quote).toMatchObject({
      mode: 'open_slot',
      holdWeeks: 4,
      rentUsd: 4,
      deferredShippingUsd: 15,
      grandTotal: 44,
    })
    expect(quote.heldUntil.toISOString()).toBe(new Date(NOW.getTime() + 4 * WEEK_MS).toISOString())
  })

  it('joins an open slot without extra rent', () => {
    const slot = slotWindow(NOW, 4)
    const quote = quoteQueuedCheckout({ pricing, slot, holdWeeks: 0, now: NOW })

    expect(quote).toMatchObject({ mode: 'join_slot', holdWeeks: 0, rentUsd: 0, grandTotal: 40 })
    expect(quote.heldUntil.toISOString()).toBe(slot.held_until)
  })

  it('clamps hold requests to what the slot allows', () => {
    expect(quoteQueuedCheckout({ pricing, holdWeeks: 0, now: NOW }).holdWeeks).toBe(1)
    expect(quoteQueuedCheckout({ pricing, holdWeeks: 52, now: NOW }).holdWeeks).toBe(13)
    expect(
      quoteQueuedCheckout({ pricing, slot: slotWindow(NOW, 4), holdWeeks: 52, now: NOW }).holdWeeks
    ).toBe(9)
  })
})

describe('isMailSlotsSchemaMissing', () => {
  it('recognizes an undeployed migration', () => {
    expect(isMailSlotsSchemaMissing('relation "public.singles_mail_slots" does not exist')).toBe(true)
    expect(
      isMailSlotsSchemaMissing(
        'Could not find the function public.create_singles_checkout(p_buyer_user_id, p_cart_items, p_hold_weeks, p_queue_in_mail_slot, p_redeem_points) in the schema cache'
      )
    ).toBe(true)
    expect(isMailSlotsSchemaMissing('Could not find the function public.release_singles_mail_slot(p_slot_id)')).toBe(true)
  })

  it('does not swallow real errors', () => {
    expect(isMailSlotsSchemaMissing('Only the buyer can release this mail slot.')).toBe(false)
    expect(
      isMailSlotsSchemaMissing('duplicate key value violates unique constraint "singles_mail_slots_one_open_per_pair"')
    ).toBe(false)
  })
})
