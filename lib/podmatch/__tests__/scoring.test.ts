import { describe, expect, it } from 'vitest'
import { scoreDeck, type SignalCardInput } from '../scoring'

function card(partial: Partial<SignalCardInput> & { card_name: string }): SignalCardInput {
  return {
    section: 'mainboard',
    quantity: 1,
    type_line: 'Creature',
    oracle_text: '',
    cmc: 3,
    mana_cost: '{2}{G}',
    color_identity: ['G'],
    price_usd: 0,
    price_usd_foil: 0,
    rarity: 'common',
    ...partial,
  }
}

const land = (name: string) =>
  card({ card_name: name, type_line: 'Basic Land', cmc: 0, oracle_text: '{T}: Add {G}.' })

// ---- Sample decks at ascending power levels --------------------------------

const PRECON_DECK: SignalCardInput[] = [
  card({ card_name: 'Big Vanilla Beast', cmc: 6, oracle_text: 'Trample.' }),
  card({ card_name: 'Slow Golem', cmc: 5, oracle_text: '' }),
  card({ card_name: 'Clumsy Ogre', cmc: 5, oracle_text: '' }),
  card({ card_name: 'Lumbering Treefolk', cmc: 6, oracle_text: '' }),
  card({ card_name: 'Gentle Giant', cmc: 4, oracle_text: '' }),
  card({ card_name: 'Vanilla Knight', cmc: 4, oracle_text: '' }),
  ...Array.from({ length: 6 }, (_, i) => land(`Forest ${i}`)),
]

const MID_DECK: SignalCardInput[] = [
  card({ card_name: 'Sol Ring', type_line: 'Artifact', cmc: 1, oracle_text: '{T}: Add {C}{C}.' }),
  card({
    card_name: 'Cultivate',
    type_line: 'Sorcery',
    cmc: 3,
    oracle_text: 'Search your library for up to two basic land cards.',
  }),
  card({ card_name: 'Demonic Tutor', type_line: 'Sorcery', cmc: 2, oracle_text: 'Search your library for a card.' }),
  card({ card_name: 'Swords to Plowshares', type_line: 'Instant', cmc: 1, oracle_text: 'Exile target creature.' }),
  card({ card_name: 'Beast Within', type_line: 'Instant', cmc: 3, oracle_text: 'Destroy target permanent.' }),
  card({ card_name: 'Solid Creature', cmc: 3, oracle_text: 'Draw a card.' }),
  card({ card_name: 'Another Creature', cmc: 4, oracle_text: '' }),
  ...Array.from({ length: 4 }, (_, i) => land(`Forest ${i}`)),
]

const HIGH_DECK: SignalCardInput[] = [
  card({ card_name: 'Sol Ring', type_line: 'Artifact', cmc: 1, oracle_text: '{T}: Add {C}{C}.' }),
  card({ card_name: 'Mana Crypt', type_line: 'Artifact', cmc: 0, oracle_text: '{T}: Add {C}{C}.' }),
  card({ card_name: 'Mana Vault', type_line: 'Artifact', cmc: 1, oracle_text: '{T}: Add {C}{C}{C}.' }),
  card({ card_name: 'Chrome Mox', type_line: 'Artifact', cmc: 0, oracle_text: '{T}: Add one mana.' }),
  card({ card_name: 'Demonic Tutor', type_line: 'Sorcery', cmc: 2, oracle_text: 'Search your library for a card.' }),
  card({ card_name: 'Vampiric Tutor', type_line: 'Instant', cmc: 1, oracle_text: 'Search your library for a card.' }),
  card({ card_name: 'Mystical Tutor', type_line: 'Instant', cmc: 1, oracle_text: 'Search your library for an instant or sorcery card.' }),
  card({ card_name: "Thassa's Oracle", type_line: 'Creature', cmc: 2, oracle_text: 'Look at the top cards of your library.' }),
  card({ card_name: 'Demonic Consultation', type_line: 'Instant', cmc: 1, oracle_text: 'Search your library for a card.' }),
  card({ card_name: 'Swords to Plowshares', type_line: 'Instant', cmc: 1, oracle_text: 'Exile target creature.' }),
  card({ card_name: 'Counterspell', type_line: 'Instant', cmc: 2, oracle_text: 'Counter target spell.' }),
  ...Array.from({ length: 3 }, (_, i) => land(`Island ${i}`)),
]

const CEDH_DECK: SignalCardInput[] = [
  ...HIGH_DECK,
  card({ card_name: 'Ad Nauseam', type_line: 'Instant', cmc: 5, oracle_text: 'Reveal the top card of your library.' }),
  card({ card_name: 'Underworld Breach', type_line: 'Enchantment', cmc: 2, oracle_text: 'Escape.' }),
  card({ card_name: "Lion's Eye Diamond", type_line: 'Artifact', cmc: 0, oracle_text: 'Add three mana.' }),
  card({ card_name: 'Force of Will', type_line: 'Instant', cmc: 5, oracle_text: 'Counter target spell.' }),
  card({ card_name: 'Imperial Seal', type_line: 'Sorcery', cmc: 1, oracle_text: 'Search your library for a card.' }),
  card({ card_name: 'Gamble', type_line: 'Sorcery', cmc: 1, oracle_text: 'Search your library for a card.' }),
]

describe('scoreDeck', () => {
  it('is deterministic for the same input', () => {
    const a = scoreDeck(HIGH_DECK)
    const b = scoreDeck(HIGH_DECK)
    expect(a).toEqual(b)
  })

  it('produces overall power in ascending bands by deck strength', () => {
    const precon = scoreDeck(PRECON_DECK).overall_power
    const mid = scoreDeck(MID_DECK).overall_power
    const high = scoreDeck(HIGH_DECK).overall_power
    const cedh = scoreDeck(CEDH_DECK).overall_power

    expect(precon).toBeLessThan(mid)
    expect(mid).toBeLessThan(high)
    expect(cedh).toBeGreaterThanOrEqual(high)
    expect(cedh).toBeLessThanOrEqual(10)
    expect(precon).toBeGreaterThanOrEqual(0)
  })

  it('attaches non-empty drivers to every sub-score', () => {
    const score = scoreDeck(HIGH_DECK)
    for (const entry of Object.values(score.explanation)) {
      expect(entry.drivers.length).toBeGreaterThan(0)
    }
  })

  it('detects tutors, fast mana, and combos in a high-power deck', () => {
    const score = scoreDeck(HIGH_DECK)
    expect(score.tutor_density).toBeGreaterThan(0)
    expect(score.combo_density).toBeGreaterThan(0)
    expect(score.speed).toBeGreaterThan(0)
  })

  it('keeps a vanilla precon low on combo and tutor density', () => {
    const score = scoreDeck(PRECON_DECK)
    expect(score.combo_density).toBe(0)
    expect(score.tutor_density).toBe(0)
  })
})
