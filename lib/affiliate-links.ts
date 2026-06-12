export type AffiliateMarketplace = 'tcgplayer' | 'cardmarket' | 'cardkingdom' | 'scryfall'

export type AffiliateLink = {
  marketplace: AffiliateMarketplace
  label: string
  href: string
  disclosure: string
}

const MARKETPLACE_LABELS: Record<AffiliateMarketplace, string> = {
  tcgplayer: 'TCGplayer',
  cardmarket: 'Cardmarket',
  cardkingdom: 'Card Kingdom',
  scryfall: 'Scryfall',
}

function addTrackingParams(url: URL, source: string) {
  url.searchParams.set('utm_source', 'deckswap')
  url.searchParams.set('utm_medium', 'affiliate')
  url.searchParams.set('utm_campaign', source)
  return url.toString()
}

export function buildMarketplaceSearchUrl(args: {
  marketplace: AffiliateMarketplace
  cardName: string
  setCode?: string | null
  collectorNumber?: string | null
}) {
  const cardName = args.cardName.trim()

  switch (args.marketplace) {
    case 'tcgplayer': {
      const url = new URL('https://www.tcgplayer.com/search/magic/product')
      url.searchParams.set('productLineName', 'magic')
      url.searchParams.set('q', cardName)
      url.searchParams.set('view', 'grid')
      return addTrackingParams(url, 'optimizer')
    }
    case 'cardmarket': {
      const url = new URL('https://www.cardmarket.com/en/Magic/Products/Search')
      url.searchParams.set('searchString', cardName)
      return addTrackingParams(url, 'optimizer')
    }
    case 'cardkingdom': {
      const url = new URL('https://www.cardkingdom.com/catalog/search')
      url.searchParams.set('search', 'header')
      url.searchParams.set('filter[name]', cardName)
      return addTrackingParams(url, 'optimizer')
    }
    case 'scryfall': {
      const query =
        args.setCode && args.collectorNumber
          ? `!"${cardName}" set:${args.setCode} cn:${args.collectorNumber}`
          : `!"${cardName}"`
      const url = new URL('https://scryfall.com/search')
      url.searchParams.set('q', query)
      return addTrackingParams(url, 'optimizer')
    }
  }
}

export function buildAffiliateRedirectUrl(args: {
  marketplace: AffiliateMarketplace
  cardName: string
  deckId?: number | null
  opportunityId?: string | null
  setCode?: string | null
  collectorNumber?: string | null
}) {
  const target = buildMarketplaceSearchUrl(args)
  const params = new URLSearchParams({
    marketplace: args.marketplace,
    card: args.cardName,
    target,
  })

  if (args.deckId) params.set('deckId', String(args.deckId))
  if (args.opportunityId) params.set('opportunityId', args.opportunityId)

  return `/api/affiliate/out?${params.toString()}`
}

export function getMarketplaceLinks(args: {
  cardName: string
  deckId?: number | null
  opportunityId?: string | null
  setCode?: string | null
  collectorNumber?: string | null
  marketplaces?: AffiliateMarketplace[]
}): AffiliateLink[] {
  const marketplaces = args.marketplaces ?? ['tcgplayer', 'cardmarket', 'cardkingdom']

  return marketplaces.map((marketplace) => ({
    marketplace,
    label: MARKETPLACE_LABELS[marketplace],
    href: buildAffiliateRedirectUrl({
      marketplace,
      cardName: args.cardName,
      deckId: args.deckId,
      opportunityId: args.opportunityId,
      setCode: args.setCode,
      collectorNumber: args.collectorNumber,
    }),
    disclosure:
      marketplace === 'scryfall'
        ? 'Reference link'
        : 'Sponsored marketplace link',
  }))
}
