// QShip — bundled sample inventory and member for the admin dry run.
//
// Used when the service role isn't configured or the hub has no stock yet,
// the same graceful fallback Arb'r uses for eBay. Card names are real;
// prices, EDHREC figures, and signals are illustrative, not live data.

import type {
  MarketSignal,
  QshipCardFacts,
  QshipInventoryCandidate,
  QshipMemberProfile,
  QshipSourceChannel,
} from './types'

type SampleCard = {
  slug: string
  name: string
  set: [code: string, name: string, releasedAt: string]
  rarity: string
  price: number
  /** Price 7 / 30 / 90 days ago. */
  history?: [number, number, number]
  colors: string[]
  type: string
  text: string
  cmc: number
  inclusion: number
  deckCount: number
  printings: number
  reserved?: boolean
  signals?: MarketSignal[]
  channel?: QshipSourceChannel
  costRatio?: number
}

const SAMPLE_CARDS: SampleCard[] = [
  { slug: 'sol-ring', name: 'Sol Ring', set: ['cmm', 'Commander Masters', '2023-08-04'], rarity: 'uncommon', price: 1.8, colors: [], type: 'Artifact', text: '{T}: Add {C}{C}.', cmc: 1, inclusion: 85, deckCount: 900_000, printings: 60 },
  { slug: 'smothering-tithe', name: 'Smothering Tithe', set: ['rna', 'Ravnica Allegiance', '2019-01-25'], rarity: 'rare', price: 18, history: [18.2, 17.5, 16.8], colors: ['W'], type: 'Enchantment', text: "Whenever an opponent draws a card, that player may pay {2}. If they don't, you create a Treasure token.", cmc: 4, inclusion: 30, deckCount: 250_000, printings: 4 },
  { slug: 'grave-pact', name: 'Grave Pact', set: ['c21', 'Commander 2021', '2021-04-23'], rarity: 'rare', price: 12, history: [12, 11.6, 11], colors: ['B'], type: 'Enchantment', text: 'Whenever a creature you control dies, each other player sacrifices a creature.', cmc: 4, inclusion: 40, deckCount: 140_000, printings: 6 },
  { slug: 'phyrexian-altar', name: 'Phyrexian Altar', set: ['2xm', 'Double Masters', '2020-08-07'], rarity: 'rare', price: 16, history: [16, 15.8, 15], colors: [], type: 'Artifact', text: 'Sacrifice a creature: Add one mana of any color.', cmc: 3, inclusion: 35, deckCount: 90_000, printings: 3 },
  { slug: 'skullclamp', name: 'Skullclamp', set: ['c20', 'Commander 2020', '2020-04-17'], rarity: 'uncommon', price: 4, history: [4, 3.9, 3.7], colors: [], type: 'Artifact — Equipment', text: 'Whenever equipped creature dies, draw two cards.', cmc: 1, inclusion: 45, deckCount: 200_000, printings: 5 },
  { slug: 'eternal-witness', name: 'Eternal Witness', set: ['tsr', 'Time Spiral Remastered', '2021-03-19'], rarity: 'uncommon', price: 2.5, history: [2.5, 2.4, 2.4], colors: ['G'], type: 'Creature — Human Shaman', text: 'When Eternal Witness enters, you may return target card from your graveyard to your hand.', cmc: 3, inclusion: 38, deckCount: 310_000, printings: 12 },
  { slug: 'ramunap-excavator', name: 'Ramunap Excavator', set: ['hou', 'Hour of Devastation', '2017-07-14'], rarity: 'rare', price: 3, history: [3, 2.8, 2.6], colors: ['G'], type: 'Creature — Naga Cleric', text: 'You may play lands from your graveyard.', cmc: 3, inclusion: 22, deckCount: 60_000, printings: 2 },
  { slug: 'deathrite-shaman', name: 'Deathrite Shaman', set: ['rtr', 'Return to Ravnica', '2012-10-05'], rarity: 'rare', price: 3.5, history: [3.4, 3.2, 3], colors: ['B', 'G'], type: 'Creature — Elf Shaman', text: '{T}: Exile target land card from a graveyard. Add one mana of any color.', cmc: 1, inclusion: 20, deckCount: 45_000, printings: 4 },
  { slug: 'victimize', name: 'Victimize', set: ['2x2', 'Double Masters 2022', '2022-07-08'], rarity: 'uncommon', price: 1.2, colors: ['B'], type: 'Sorcery', text: 'Choose two target creature cards in your graveyard. Sacrifice a creature, then return the chosen cards to the battlefield tapped.', cmc: 3, inclusion: 25, deckCount: 70_000, printings: 5 },
  { slug: 'sakura-tribe-elder', name: 'Sakura-Tribe Elder', set: ['c21', 'Commander 2021', '2021-04-23'], rarity: 'common', price: 0.6, colors: ['G'], type: 'Creature — Snake Shaman', text: 'Sacrifice Sakura-Tribe Elder: Search your library for a basic land card.', cmc: 2, inclusion: 50, deckCount: 400_000, printings: 15 },
  { slug: 'sylvan-library', name: 'Sylvan Library', set: ['ema', 'Eternal Masters', '2016-06-10'], rarity: 'rare', price: 28, history: [28, 27, 26], colors: ['G'], type: 'Enchantment', text: 'At the beginning of your draw step, you may draw two additional cards.', cmc: 2, inclusion: 28, deckCount: 180_000, printings: 4 },
  { slug: 'blood-artist', name: 'Blood Artist', set: ['j22', 'Jumpstart 2022', '2022-12-02'], rarity: 'uncommon', price: 2, colors: ['B'], type: 'Creature — Vampire', text: 'Whenever Blood Artist or another creature dies, target player loses 1 life and you gain 1 life.', cmc: 2, inclusion: 30, deckCount: 160_000, printings: 8, channel: 'supply', costRatio: 0.82 },
  { slug: 'scroll-rack', name: 'Scroll Rack', set: ['tmp', 'Tempest', '1997-10-14'], rarity: 'rare', price: 12, history: [12, 11.8, 11.5], colors: [], type: 'Artifact', text: '{1}, {T}: Exile any number of cards from your hand face down. Put that many cards from the top of your library into your hand.', cmc: 2, inclusion: 12, deckCount: 60_000, printings: 3 },
  { slug: 'enlightened-tutor', name: 'Enlightened Tutor', set: ['mir', 'Mirage', '1996-10-08'], rarity: 'uncommon', price: 15, history: [15, 14.6, 14], colors: ['W'], type: 'Instant', text: 'Search your library for an artifact or enchantment card, reveal it, then shuffle and put that card on top.', cmc: 1, inclusion: 20, deckCount: 70_000, printings: 5 },
  { slug: 'toxic-deluge', name: 'Toxic Deluge', set: ['cmm', 'Commander Masters', '2023-08-04'], rarity: 'rare', price: 10, history: [10, 9.6, 9.4], colors: ['B'], type: 'Sorcery', text: 'As an additional cost to cast this spell, pay X life. All creatures get -X/-X until end of turn.', cmc: 3, inclusion: 22, deckCount: 190_000, printings: 5 },
  { slug: 'swords-to-plowshares', name: 'Swords to Plowshares', set: ['sta', 'Strixhaven Mystical Archive', '2021-04-23'], rarity: 'uncommon', price: 2.2, colors: ['W'], type: 'Instant', text: 'Exile target creature. Its controller gains life equal to its power.', cmc: 1, inclusion: 25, deckCount: 500_000, printings: 30 },
  { slug: 'grim-monolith', name: 'Grim Monolith', set: ['ulg', "Urza's Legacy", '1999-02-15'], rarity: 'rare', price: 60, history: [60, 58, 55], colors: [], type: 'Artifact', text: '{T}: Add {C}{C}{C}.', cmc: 2, inclusion: 10, deckCount: 40_000, printings: 1, reserved: true },
  { slug: 'ashnods-altar', name: "Ashnod's Altar", set: ['ema', 'Eternal Masters', '2016-06-10'], rarity: 'uncommon', price: 9, history: [8.8, 7.5, 7], colors: [], type: 'Artifact', text: 'Sacrifice a creature: Add {C}{C}.', cmc: 3, inclusion: 18, deckCount: 80_000, printings: 5, signals: [{ kind: 'new_synergy', strength: 0.6, detail: 'A spoiled aristocrats commander wants free sacrifice outlets.' }] },
  { slug: 'tergrid', name: 'Tergrid, God of Fright', set: ['khm', 'Kaldheim', '2021-02-05'], rarity: 'rare', price: 11, history: [10.8, 9.5, 9], colors: ['B'], type: 'Legendary Creature — God', text: 'Whenever an opponent sacrifices a nontoken permanent or discards a permanent card, you may put that card onto the battlefield under your control.', cmc: 5, inclusion: 15, deckCount: 50_000, printings: 2, signals: [{ kind: 'meta_rise', strength: 0.5, detail: 'Rising cEDH share in stax lists over the last month.' }] },
  { slug: 'cyclonic-rift', name: 'Cyclonic Rift', set: ['cmm', 'Commander Masters', '2023-08-04'], rarity: 'rare', price: 30, history: [30, 31, 32], colors: ['U'], type: 'Instant', text: 'Return target nonland permanent you don’t control to its owner’s hand. Overload {6}{U}.', cmc: 2, inclusion: 35, deckCount: 330_000, printings: 6, signals: [{ kind: 'reprint_risk', strength: 1, detail: 'Spoiled as a reprint in an upcoming Commander product.' }] },
  { slug: 'great-henge', name: 'The Great Henge', set: ['eld', 'Throne of Eldraine', '2019-10-04'], rarity: 'mythic', price: 26, history: [26, 24, 22], colors: ['G'], type: 'Legendary Artifact', text: 'Creatures you control enter with an additional +1/+1 counter. Whenever a nontoken creature you control enters, draw a card.', cmc: 9, inclusion: 16, deckCount: 110_000, printings: 2, channel: 'supply', costRatio: 0.83 },
  { slug: 'birds-of-paradise', name: 'Birds of Paradise', set: ['m12', 'Magic 2012', '2011-07-15'], rarity: 'rare', price: 8, history: [8, 7.9, 7.8], colors: ['G'], type: 'Creature — Bird', text: 'Flying. {T}: Add one mana of any color.', cmc: 1, inclusion: 18, deckCount: 120_000, printings: 20 },
  { slug: 'mystic-remora', name: 'Mystic Remora', set: ['ice', 'Ice Age', '1995-06-01'], rarity: 'common', price: 5, history: [5, 4.4, 4], colors: ['U'], type: 'Enchantment', text: 'Whenever an opponent casts a noncreature spell, you may draw a card unless that player pays {4}.', cmc: 1, inclusion: 14, deckCount: 90_000, printings: 5 },
  { slug: 'reanimate', name: 'Reanimate', set: ['tmp', 'Tempest', '1997-10-14'], rarity: 'uncommon', price: 7, history: [7, 6.8, 6.5], colors: ['B'], type: 'Sorcery', text: 'Put target creature card from a graveyard onto the battlefield under your control. You lose life equal to its mana value.', cmc: 1, inclusion: 20, deckCount: 85_000, printings: 6, channel: 'supply', costRatio: 0.8 },
]

function toFacts(sample: SampleCard): QshipCardFacts {
  const [setCode, setName, releasedAt] = sample.set
  const [d7, d30, d90] = sample.history ?? [sample.price, sample.price, sample.price]
  return {
    scryfallId: `sample-${sample.slug}`,
    oracleId: `sample-oracle-${sample.slug}`,
    cardName: sample.name,
    setCode,
    setName,
    releasedAt,
    rarity: sample.rarity,
    foil: false,
    finishes: ['nonfoil'],
    oracleText: sample.text,
    typeLine: sample.type,
    keywords: [],
    cmc: sample.cmc,
    colorIdentity: sample.colors,
    artistName: null,
    reserved: sample.reserved ?? false,
    printingCount: sample.printings,
    priceUsd: sample.price,
    priceHistory: { d7, d30, d90 },
    buylistUsd: null,
    edhrec: { inclusionPercent: sample.inclusion, deckCount: sample.deckCount },
    signals: sample.signals ?? [],
  }
}

export const SAMPLE_QSHIP_INVENTORY: QshipInventoryCandidate[] = SAMPLE_CARDS.map((sample) => ({
  inventoryId: `sample-${sample.slug}`,
  channel: sample.channel ?? 'pool',
  costBasisUsd: Number((sample.price * (sample.costRatio ?? 0.62)).toFixed(2)),
  condition: 'near_mint',
  language: 'en',
  card: toFacts(sample),
}))

const oracle = (slug: string) => `sample-oracle-${slug}`

export const SAMPLE_QSHIP_MEMBER: QshipMemberProfile = {
  userId: 'sample-member',
  planKey: 'standard',
  riskProfile: 'balanced',
  focusDecks: [
    {
      deckId: -1,
      name: 'Meren Aristocrats',
      commanderName: 'Meren of Clan Nel Toth',
      colorIdentity: ['B', 'G'],
      cardOracleIds: [oracle('sol-ring'), oracle('sakura-tribe-elder')],
      gapInclusion: {
        [oracle('grave-pact')]: 40,
        [oracle('phyrexian-altar')]: 35,
        [oracle('skullclamp')]: 45,
        [oracle('eternal-witness')]: 38,
        [oracle('ramunap-excavator')]: 22,
        [oracle('deathrite-shaman')]: 20,
        [oracle('victimize')]: 25,
        [oracle('blood-artist')]: 30,
        [oracle('sylvan-library')]: 28,
        [oracle('reanimate')]: 18,
        [oracle('ashnods-altar')]: 26,
      },
    },
    {
      deckId: -2,
      name: 'Atraxa Superfriends',
      commanderName: "Atraxa, Praetors' Voice",
      colorIdentity: ['W', 'U', 'B', 'G'],
      cardOracleIds: [oracle('sol-ring')],
      gapInclusion: {
        [oracle('smothering-tithe')]: 30,
        [oracle('enlightened-tutor')]: 20,
        [oracle('swords-to-plowshares')]: 25,
        [oracle('cyclonic-rift')]: 35,
        [oracle('toxic-deluge')]: 22,
      },
    },
  ],
  ownedOracleIds: [oracle('sol-ring'), oracle('sakura-tribe-elder')],
  preferences: {
    finishPref: 'any',
    framePrefs: ['old_border'],
    favoriteArtists: [],
    blockedOracleIds: [],
    blockedSetCodes: [],
    blockedArtists: [],
    minCondition: 'light_play',
    language: 'en',
  },
}
