import { describe, expect, it } from 'vitest'
import { parseDeckText } from '../parse'

describe('parseDeckText', () => {
  it('parses pasted text exports with commander, mainboard, and maybeboard sections', () => {
    const cards = parseDeckText(`Commander
1 Thrakkus the Butcher

Mainboard
1 Goddric, Cloaked Reveler
6 Forest
20 Mountain

Maybeboard
1 Decimate
1 Treasure`)

    expect(cards).toEqual([
      {
        section: 'commander',
        quantity: 1,
        cardName: 'Thrakkus the Butcher',
        foil: false,
        setCode: undefined,
        collectorNumber: undefined,
      },
      {
        section: 'mainboard',
        quantity: 1,
        cardName: 'Goddric, Cloaked Reveler',
        foil: false,
        setCode: undefined,
        collectorNumber: undefined,
      },
      {
        section: 'mainboard',
        quantity: 6,
        cardName: 'Forest',
        foil: false,
        setCode: undefined,
        collectorNumber: undefined,
      },
      {
        section: 'mainboard',
        quantity: 20,
        cardName: 'Mountain',
        foil: false,
        setCode: undefined,
        collectorNumber: undefined,
      },
      {
        section: 'sideboard',
        quantity: 1,
        cardName: 'Decimate',
        foil: false,
        setCode: undefined,
        collectorNumber: undefined,
      },
      {
        section: 'sideboard',
        quantity: 1,
        cardName: 'Treasure',
        foil: false,
        setCode: undefined,
        collectorNumber: undefined,
      },
    ])
  })

  it('parses headerless CSV deck exports with print metadata', () => {
    const rows = [
      "1,Thrakkus the Butcher,Commander Legends: Battle for Baldur's Gate,clb,440",
      '1,"Goddric, Cloaked Reveler",Wilds of Eldraine,woe,132',
      '1,Smoldering Egg // Ashmouth Dragon,Innistrad: Midnight Hunt,mid,159',
      '20,Mountain,Foundations,fdn,275',
      '1,Treasure,Aetherdrift Tokens,tdft,11',
      ...Array.from({ length: 56 }, (_, index) => {
        const collectorNumber = 200 + index
        return `1,Filler Dragon ${index + 1},Example Set,exm,${collectorNumber}`
      }),
    ]

    const cards = parseDeckText(rows.join('\n'), 'text')

    expect(cards[0]).toMatchObject({
      section: 'commander',
      quantity: 1,
      cardName: 'Thrakkus the Butcher',
      setName: "Commander Legends: Battle for Baldur's Gate",
      setCode: 'clb',
      collectorNumber: '440',
    })
    expect(cards[1]).toMatchObject({
      section: 'mainboard',
      cardName: 'Goddric, Cloaked Reveler',
      setCode: 'woe',
      collectorNumber: '132',
    })
    expect(cards[4]).toMatchObject({
      section: 'token',
      cardName: 'Treasure',
      setCode: 'tdft',
      collectorNumber: '11',
    })
    expect(cards).toHaveLength(61)
  })
})
