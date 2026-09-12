import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchScryfallCollection } from '@/lib/scryfall/enrich'

describe('fetchScryfallCollection', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends the headers required by Scryfall', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await fetchScryfallCollection([
      { set: 'mh2', collector_number: '300' },
    ])

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.scryfall.com/cards/collection',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Accept: 'application/json;q=0.9,*/*;q=0.8',
          'Content-Type': 'application/json',
          'User-Agent': 'Mythivex/1.0 (+https://mythivex.com)',
        },
      })
    )
  })

  it('keeps collection requests within Scryfall\'s 75-card limit', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await fetchScryfallCollection(
      Array.from({ length: 76 }, (_, index) => ({ name: `Card ${index}` }))
    )

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const firstBody = JSON.parse(fetchMock.mock.calls[0][1].body)
    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(firstBody.identifiers).toHaveLength(75)
    expect(secondBody.identifiers).toHaveLength(1)
  })
})
