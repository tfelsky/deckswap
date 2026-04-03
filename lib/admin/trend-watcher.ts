type TrendSourceKind = 'official' | 'marketplace'

export type TrendItem = {
  source: string
  kind: TrendSourceKind
  title: string
  url: string
}

export type TrendWatcherReport = {
  official: TrendItem[]
  marketplace: TrendItem[]
  themes: string[]
  viralPrompt: string
}

type SourceConfig = {
  label: string
  kind: TrendSourceKind
  url: string
  parser: 'rss' | 'wizards-html'
}

const SOURCES: SourceConfig[] = [
  {
    label: 'Wizards DailyMTG',
    kind: 'official',
    url: 'https://magic.wizards.com/en/news',
    parser: 'wizards-html',
  },
  {
    label: 'Wizards Announcements',
    kind: 'official',
    url: 'https://magic.wizards.com/en/news/announcements',
    parser: 'wizards-html',
  },
  {
    label: 'EDHREC',
    kind: 'marketplace',
    url: 'https://edhrec.com/articles/feed',
    parser: 'rss',
  },
  {
    label: 'Star City Games',
    kind: 'marketplace',
    url: 'https://articles.starcitygames.com/feed',
    parser: 'rss',
  },
  {
    label: 'Card Kingdom Blog',
    kind: 'marketplace',
    url: 'https://blog.cardkingdom.com/feed',
    parser: 'rss',
  },
]

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'into',
  'your',
  'that',
  'this',
  'have',
  'will',
  'are',
  'now',
  'all',
  'out',
  'how',
  'why',
  'what',
  'when',
  'new',
  'mtg',
  'magic',
  'gathering',
  'commander',
  'guide',
  'deck',
  'decks',
  'cards',
  'card',
])

const MTG_MARKETPLACE_KEYWORDS = [
  'magic',
  'mtg',
  'commander',
  'secret lair',
  'standard',
  'modern',
  'legacy',
  'pauper',
  'cedh',
  'edh',
  'lorwyn',
  'strixhaven',
  'final fantasy',
]

function decodeHtmlEntities(text: string) {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
}

function cleanText(text: string) {
  return decodeHtmlEntities(text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
}

function isRelevantMarketplaceHeadline(title: string) {
  const lower = title.toLowerCase()
  return MTG_MARKETPLACE_KEYWORDS.some((keyword) => lower.includes(keyword))
}

function uniqueByUrl(items: TrendItem[]) {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.url)) return false
    seen.add(item.url)
    return true
  })
}

function parseRssItems(xml: string, source: SourceConfig): TrendItem[] {
  const items: TrendItem[] = []
  const matches = xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)

  for (const match of matches) {
    const block = match[0]
    const title = cleanText(block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '')
    const url = cleanText(block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] ?? '')

    if (!title || !url) continue
    if (source.kind === 'marketplace' && !isRelevantMarketplaceHeadline(title)) continue

    items.push({
      source: source.label,
      kind: source.kind,
      title,
      url,
    })
  }

  return items
}

function parseWizardsHtml(html: string, source: SourceConfig): TrendItem[] {
  const items: TrendItem[] = []
  const matches = html.matchAll(/href="(\/en\/news\/[^"#?]+)"[^>]*>([\s\S]*?)<\/a>/gi)

  for (const match of matches) {
    const href = match[1]
    const rawTitle = cleanText(match[2] ?? '')

    if (!rawTitle || rawTitle.length < 8) continue
    if (rawTitle.toLowerCase() === 'read now') continue
    if (rawTitle.toLowerCase() === 'learn more') continue
    if (rawTitle.toLowerCase().includes('more articles')) continue

    items.push({
      source: source.label,
      kind: source.kind,
      title: rawTitle,
      url: href.startsWith('http') ? href : `https://magic.wizards.com${href}`,
    })
  }

  return items
}

function extractThemes(items: TrendItem[]) {
  const scores = new Map<string, number>()

  for (const item of items) {
    const words = item.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length >= 4 && !STOP_WORDS.has(word))

    for (const word of words) {
      scores.set(word, (scores.get(word) ?? 0) + 1)
    }
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word]) => word)
}

function buildViralPrompt(report: Omit<TrendWatcherReport, 'viralPrompt'>) {
  const allItems = [...report.official, ...report.marketplace].slice(0, 8)
  const headlineBullets = allItems.map((item) => `- ${item.source}: ${item.title}`).join('\n')
  const themeLine =
    report.themes.length > 0 ? report.themes.join(', ') : 'commander, pricing, releases'

  return [
    'Create 8 short-form content ideas for DeckSwap based on today\'s MTG trend watch.',
    'Goal: make the posts feel timely, marketplace-aware, and shareable for Commander players.',
    'Audience: Commander deck brewers, traders, and value-conscious marketplace users.',
    `Theme signals: ${themeLine}.`,
    'Use these source headlines as inspiration:',
    headlineBullets,
    'Output format:',
    '1. Hook',
    '2. Core angle',
    '3. Recommended format (tweet thread, carousel, reel script, email opener, blog stub)',
    '4. Why it could go viral for MTG players',
    '5. Soft DeckSwap tie-in',
    'Constraints: avoid fake claims, keep it grounded in actual headlines, and bias toward value-for-value trading, deck import, pricing, Commander brackets, and deck discovery.',
  ].join('\n')
}

export async function getTrendWatcherReport(): Promise<TrendWatcherReport> {
  const settled = await Promise.allSettled(
    SOURCES.map(async (source) => {
      const response = await fetch(source.url, {
        cache: 'no-store',
        headers: {
          'user-agent': 'DeckSwap Trend Watcher',
        },
      })

      if (!response.ok) {
        throw new Error(`${source.label} returned ${response.status}`)
      }

      const text = await response.text()
      return source.parser === 'rss'
        ? parseRssItems(text, source)
        : parseWizardsHtml(text, source)
    })
  )

  const items = settled.flatMap((result) =>
    result.status === 'fulfilled' ? result.value : []
  )

  const uniqueItems = uniqueByUrl(items)
  const official = uniqueItems.filter((item) => item.kind === 'official').slice(0, 8)
  const marketplace = uniqueItems
    .filter((item) => item.kind === 'marketplace')
    .slice(0, 8)
  const themes = extractThemes([...official, ...marketplace])

  const partialReport = {
    official,
    marketplace,
    themes,
  }

  return {
    ...partialReport,
    viralPrompt: buildViralPrompt(partialReport),
  }
}
