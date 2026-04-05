import { getTrendWatcherReport, type TrendItem } from '@/lib/admin/trend-watcher'
import { formatDirectSaleOrderStatus, formatDirectSaleOrderType } from '@/lib/direct-sales'
import { getDeckFormatLabel, normalizeDeckFormat } from '@/lib/decks/formats'
import { getEmailConfigSnapshot } from '@/lib/email'
import {
  isInventoryStatusCompleted,
  isInventoryStatusPublic,
} from '@/lib/decks/inventory-status'
import { createAdminClient } from '@/lib/supabase/admin'

type DeckListingRow = {
  id: number
  name: string
  commander?: string | null
  format?: string | null
  price_total_usd_foil?: number | null
  buy_now_price_usd?: number | null
  inventory_status?: string | null
  image_url?: string | null
}

type DirectSaleNewsletterRow = {
  id: number
  deck_id: number
  order_type: 'buy_now' | 'guaranteed_offer'
  status: string
  price_usd: number
  shipping_label_addon_usd?: number | null
  checkout_confirmed_at?: string | null
  payment_confirmed_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

type NewsletterDeck = {
  id: number
  name: string
  commander: string | null
  formatLabel: string
  listingLabel: string
  priceLabel: string
  detailLabel: string
  imageUrl: string | null
  url: string
}

type NewsletterSale = {
  id: number
  deckName: string
  totalLabel: string
  statusLabel: string
  orderTypeLabel: string
  happenedLabel: string
  url: string
}

type NewsletterIssueSectionData = {
  upcomingSetName: string
  officialHeadlines: TrendItem[]
  creatorSpotlights: TrendItem[]
  bestDecksForSale: NewsletterDeck[]
  latestDecksForSale: NewsletterDeck[]
  latestSales: NewsletterSale[]
  completedDeckMoves: NewsletterDeck[]
}

export type MarketplaceNewsletterDraft = {
  subject: string
  previewText: string
  name: string
  body: string
  html: string
  text: string
  ctaLabel: string
  ctaUrl: string
  sections: NewsletterIssueSectionData
}

type BuildMarketplaceNewsletterInput = {
  upcomingSetName?: string | null
  creatorFilters?: string[]
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatUsd(value?: number | null) {
  return `$${Number(value ?? 0).toFixed(2)}`
}

function formatShortDate(value?: string | null) {
  if (!value) return 'Recently'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Recently'

  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
  }).format(parsed)
}

function normalizeFilters(filters?: string[]) {
  return (filters ?? [])
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
}

function matchesFilters(item: TrendItem, filters: string[]) {
  if (filters.length === 0) return true

  const haystack = `${item.source} ${item.title}`.toLowerCase()
  return filters.some((filter) => haystack.includes(filter))
}

function toNewsletterDeck(
  deck: DeckListingRow,
  appBaseUrl: string,
  listingLabel: string
): NewsletterDeck {
  const commander = deck.commander?.trim() || null
  const buyNow = Number(deck.buy_now_price_usd ?? 0)
  const trackedValue = Number(deck.price_total_usd_foil ?? 0)

  return {
    id: deck.id,
    name: deck.name,
    commander,
    formatLabel: getDeckFormatLabel(normalizeDeckFormat(deck.format)),
    listingLabel,
    priceLabel: buyNow > 0 ? formatUsd(buyNow) : formatUsd(trackedValue),
    detailLabel:
      buyNow > 0
        ? `Buy It Now live${trackedValue > 0 ? ` | Value ${formatUsd(trackedValue)}` : ''}`
        : `Tracked value ${formatUsd(trackedValue)}`,
    imageUrl: deck.image_url?.trim() || null,
    url: `${appBaseUrl}/decks/${deck.id}`,
  }
}

function renderDeckCard(deck: NewsletterDeck) {
  const imageBlock = deck.imageUrl
    ? `<img src="${escapeHtml(deck.imageUrl)}" alt="${escapeHtml(deck.name)}" style="display:block;width:100%;height:180px;object-fit:cover;border-radius:18px 18px 0 0;" />`
    : `<div style="padding:28px 24px;background:linear-gradient(135deg,#052e16 0%,#111827 100%);color:#d1fae5;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;border-radius:18px 18px 0 0;">${escapeHtml(deck.formatLabel)}</div>`

  return `
    <div style="margin:0 0 18px;border:1px solid #1f2937;border-radius:18px;background:#111827;overflow:hidden;">
      ${imageBlock}
      <div style="padding:20px 22px;">
        <div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#34d399;">${escapeHtml(deck.listingLabel)}</div>
        <h3 style="margin:10px 0 6px;font-size:20px;line-height:1.2;color:#f9fafb;">${escapeHtml(deck.name)}</h3>
        <p style="margin:0 0 10px;font-size:14px;color:#9ca3af;">${escapeHtml(deck.commander || deck.formatLabel)}</p>
        <p style="margin:0 0 14px;font-size:14px;color:#d1d5db;">${escapeHtml(deck.detailLabel)}</p>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
          <strong style="font-size:18px;color:#fbbf24;">${escapeHtml(deck.priceLabel)}</strong>
          <a href="${escapeHtml(deck.url)}" style="color:#34d399;text-decoration:none;font-weight:600;">View deck</a>
        </div>
      </div>
    </div>
  `
}

function renderSaleItem(sale: NewsletterSale) {
  return `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #1f2937;color:#f9fafb;font-size:14px;">
        <a href="${escapeHtml(sale.url)}" style="color:#f9fafb;text-decoration:none;font-weight:600;">${escapeHtml(sale.deckName)}</a>
        <div style="margin-top:4px;color:#9ca3af;font-size:12px;">${escapeHtml(sale.orderTypeLabel)} | ${escapeHtml(sale.statusLabel)}</div>
      </td>
      <td style="padding:12px 0;border-bottom:1px solid #1f2937;color:#fbbf24;font-size:14px;text-align:right;white-space:nowrap;">${escapeHtml(sale.totalLabel)}</td>
      <td style="padding:12px 0 12px 14px;border-bottom:1px solid #1f2937;color:#9ca3af;font-size:12px;text-align:right;white-space:nowrap;">${escapeHtml(sale.happenedLabel)}</td>
    </tr>
  `
}

function renderTrendList(items: TrendItem[], emptyLabel: string) {
  if (items.length === 0) {
    return `<p style="margin:0;color:#9ca3af;font-size:14px;">${escapeHtml(emptyLabel)}</p>`
  }

  return `
    <ul style="margin:0;padding:0;list-style:none;">
      ${items
        .map(
          (item) => `
            <li style="margin:0 0 14px;padding:0 0 14px;border-bottom:1px solid #1f2937;">
              <div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#60a5fa;">${escapeHtml(item.source)}</div>
              <a href="${escapeHtml(item.url)}" style="display:block;margin-top:8px;color:#f9fafb;text-decoration:none;font-size:16px;line-height:1.4;font-weight:600;">${escapeHtml(item.title)}</a>
            </li>
          `
        )
        .join('')}
    </ul>
  `
}

function renderDeckListText(title: string, decks: NewsletterDeck[]) {
  if (decks.length === 0) {
    return `${title}\n- No live listings yet.`
  }

  return [
    title,
    ...decks.map(
      (deck) => `- ${deck.name} (${deck.commander || deck.formatLabel}) | ${deck.priceLabel} | ${deck.url}`
    ),
  ].join('\n')
}

function renderSalesText(title: string, sales: NewsletterSale[]) {
  if (sales.length === 0) {
    return `${title}\n- No recent confirmed sales yet.`
  }

  return [
    title,
    ...sales.map(
      (sale) =>
        `- ${sale.deckName} | ${sale.orderTypeLabel} | ${sale.totalLabel} | ${sale.statusLabel} | ${sale.url}`
    ),
  ].join('\n')
}

function renderTrendText(title: string, items: TrendItem[]) {
  if (items.length === 0) {
    return `${title}\n- Nothing fresh yet.`
  }

  return [title, ...items.map((item) => `- ${item.source}: ${item.title} | ${item.url}`)].join(
    '\n'
  )
}

async function loadNewsletterMarketplaceData(appBaseUrl: string) {
  const supabase = createAdminClient()

  const [decksResult, salesResult, trendReport] = await Promise.all([
    supabase
      .from('decks')
      .select(
        'id, name, commander, format, price_total_usd_foil, buy_now_price_usd, inventory_status, image_url'
      )
      .order('id', { ascending: false })
      .limit(60),
    supabase
      .from('direct_sale_orders')
      .select(
        'id, deck_id, order_type, status, price_usd, shipping_label_addon_usd, checkout_confirmed_at, payment_confirmed_at, created_at, updated_at'
      )
      .not('checkout_confirmed_at', 'is', null)
      .neq('status', 'cancelled')
      .order('checkout_confirmed_at', { ascending: false })
      .limit(12),
    getTrendWatcherReport().catch(() => ({
      official: [] as TrendItem[],
      marketplace: [] as TrendItem[],
      themes: [] as string[],
      viralPrompt: '',
    })),
  ])

  const decks = ((decksResult.data ?? []) as DeckListingRow[]) ?? []
  const sales = ((salesResult.data ?? []) as DirectSaleNewsletterRow[]) ?? []
  const decksById = new Map<number, DeckListingRow>(decks.map((deck) => [deck.id, deck]))

  const liveDecks = decks.filter((deck) => isInventoryStatusPublic(deck.inventory_status))
  const bestDecksForSale = liveDecks
    .filter((deck) => Number(deck.buy_now_price_usd ?? 0) > 0)
    .sort((a, b) => Number(b.buy_now_price_usd ?? 0) - Number(a.buy_now_price_usd ?? 0))
    .slice(0, 4)
    .map((deck) => toNewsletterDeck(deck, appBaseUrl, 'Best decks for sale'))

  const latestDecksForSale = liveDecks
    .slice(0, 4)
    .map((deck) => toNewsletterDeck(deck, appBaseUrl, 'Latest live listing'))

  const completedDeckMoves = decks
    .filter((deck) => isInventoryStatusCompleted(deck.inventory_status))
    .slice(0, 4)
    .map((deck) => toNewsletterDeck(deck, appBaseUrl, 'Latest completed move'))

  const latestSales = sales.slice(0, 5).map((sale) => {
    const deck = decksById.get(sale.deck_id)
    const saleMoment =
      sale.payment_confirmed_at ||
      sale.checkout_confirmed_at ||
      sale.updated_at ||
      sale.created_at ||
      null

    return {
      id: sale.id,
      deckName: deck?.name || `Deck #${sale.deck_id}`,
      totalLabel: formatUsd(
        Number(sale.price_usd ?? 0) + Number(sale.shipping_label_addon_usd ?? 0)
      ),
      statusLabel: formatDirectSaleOrderStatus(sale.status),
      orderTypeLabel: formatDirectSaleOrderType(sale.order_type),
      happenedLabel: formatShortDate(saleMoment),
      url: `${appBaseUrl}/orders/${sale.id}`,
    }
  })

  return {
    trendReport,
    bestDecksForSale,
    latestDecksForSale,
    latestSales,
    completedDeckMoves,
  }
}

export async function buildMarketplaceNewsletterDraft(
  input: BuildMarketplaceNewsletterInput = {}
): Promise<MarketplaceNewsletterDraft> {
  const emailConfig = getEmailConfigSnapshot()
  const appBaseUrl = emailConfig.appBaseUrl.replace(/\/$/, '')
  const filters = normalizeFilters(input.creatorFilters)
  const {
    trendReport,
    bestDecksForSale,
    latestDecksForSale,
    latestSales,
    completedDeckMoves,
  } = await loadNewsletterMarketplaceData(appBaseUrl)

  const officialHeadlines = trendReport.official.slice(0, 3)
  const creatorSpotlights = trendReport.marketplace
    .filter((item) => matchesFilters(item, filters))
    .slice(0, 4)

  const fallbackCreatorSpotlights =
    creatorSpotlights.length > 0 ? creatorSpotlights : trendReport.marketplace.slice(0, 4)

  const upcomingSetName =
    input.upcomingSetName?.trim() || officialHeadlines[0]?.title || 'Upcoming set watch'
  const subject = `DeckSwap weekly: ${upcomingSetName}, fresh creator picks, and live deck movement`
  const previewText =
    bestDecksForSale[0] != null
      ? `See ${bestDecksForSale[0].name}, the latest live listings, and fresh marketplace sales.`
      : 'See fresh creator picks, live listings, and the latest marketplace sales.'
  const ctaUrl = `${appBaseUrl}/decks`
  const ctaLabel = 'Browse live decks'

  const sections: NewsletterIssueSectionData = {
    upcomingSetName,
    officialHeadlines,
    creatorSpotlights: fallbackCreatorSpotlights,
    bestDecksForSale,
    latestDecksForSale,
    latestSales,
    completedDeckMoves,
  }

  const body = [
    `Upcoming set: ${upcomingSetName}`,
    officialHeadlines[0]?.title ? `Lead headline: ${officialHeadlines[0].title}` : null,
    fallbackCreatorSpotlights[0]?.title
      ? `Creator spotlight: ${fallbackCreatorSpotlights[0].title}`
      : null,
    bestDecksForSale[0]?.name ? `Best deck for sale: ${bestDecksForSale[0].name}` : null,
    latestSales[0]?.deckName ? `Latest sale: ${latestSales[0].deckName}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const html = `
    <div style="background:#030712;padding:32px 12px;font-family:Arial,sans-serif;color:#e5e7eb;">
      <div style="max-width:720px;margin:0 auto;background:#0b1220;border:1px solid #1f2937;border-radius:28px;overflow:hidden;">
        <div style="padding:40px 32px;background:radial-gradient(circle at top left,#14532d 0%,#0b1220 55%,#020617 100%);">
          <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#86efac;">DeckSwap Market Brief</div>
          <h1 style="margin:18px 0 12px;font-size:34px;line-height:1.1;color:#f9fafb;">${escapeHtml(subject)}</h1>
          <p style="margin:0;max-width:560px;font-size:16px;line-height:1.6;color:#d1d5db;">
            Fresh marketplace movement for Commander players: upcoming set watch, creator headlines worth stealing ideas from, premium decks for sale, newest listings, and the latest confirmed sales.
          </p>
          <p style="margin:22px 0 0;">
            <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:13px 18px;border-radius:999px;background:#34d399;color:#052e16;text-decoration:none;font-weight:700;">${escapeHtml(ctaLabel)}</a>
          </p>
        </div>

        <div style="padding:32px;">
          <section style="margin:0 0 30px;">
            <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#60a5fa;">Upcoming set</div>
            <h2 style="margin:10px 0 14px;font-size:24px;line-height:1.2;color:#f9fafb;">${escapeHtml(upcomingSetName)}</h2>
            ${renderTrendList(officialHeadlines, 'No official release headlines available yet.')}
          </section>

          <section style="margin:0 0 30px;">
            <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#f472b6;">Favorite creators</div>
            <h2 style="margin:10px 0 14px;font-size:24px;line-height:1.2;color:#f9fafb;">Latest content worth opening</h2>
            ${renderTrendList(
              fallbackCreatorSpotlights,
              'No creator updates matched your filter, so this issue is using the freshest marketplace sources.'
            )}
          </section>

          <section style="margin:0 0 30px;">
            <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#fbbf24;">Best decks for sale</div>
            <h2 style="margin:10px 0 14px;font-size:24px;line-height:1.2;color:#f9fafb;">Highest-value live listings</h2>
            ${bestDecksForSale.length > 0 ? bestDecksForSale.map(renderDeckCard).join('') : '<p style="margin:0;color:#9ca3af;font-size:14px;">No Buy It Now decks are live right now.</p>'}
          </section>

          <section style="margin:0 0 30px;">
            <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#a78bfa;">Latest decks for sale</div>
            <h2 style="margin:10px 0 14px;font-size:24px;line-height:1.2;color:#f9fafb;">Newest live listings on DeckSwap</h2>
            ${latestDecksForSale.length > 0 ? latestDecksForSale.map(renderDeckCard).join('') : '<p style="margin:0;color:#9ca3af;font-size:14px;">No new live listings yet.</p>'}
          </section>

          <section style="margin:0 0 30px;">
            <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#22d3ee;">Latest sales</div>
            <h2 style="margin:10px 0 14px;font-size:24px;line-height:1.2;color:#f9fafb;">Recent confirmed marketplace activity</h2>
            ${
              latestSales.length > 0
                ? `<table style="width:100%;border-collapse:collapse;">${latestSales
                    .map(renderSaleItem)
                    .join('')}</table>`
                : '<p style="margin:0;color:#9ca3af;font-size:14px;">No confirmed direct sales yet.</p>'
            }
          </section>

          <section style="margin:0;">
            <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#94a3b8;">Marketplace archive</div>
            <h2 style="margin:10px 0 14px;font-size:24px;line-height:1.2;color:#f9fafb;">Recently completed deck moves</h2>
            ${completedDeckMoves.length > 0 ? completedDeckMoves.map(renderDeckCard).join('') : '<p style="margin:0;color:#9ca3af;font-size:14px;">No completed deck moves yet.</p>'}
          </section>
        </div>

        <div style="padding:24px 32px;border-top:1px solid #1f2937;background:#020617;">
          <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#9ca3af;">
            You are receiving this because you opted in to DeckSwap marketing email. Mythiverse Exchange, Ontario, Canada.
          </p>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#9ca3af;">
            Manage email preferences or unsubscribe here:
            <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#93c5fd;"> unsubscribe</a>
          </p>
        </div>
      </div>
    </div>
  `

  const text = [
    subject,
    '',
    'Fresh marketplace movement for Commander players.',
    '',
    renderTrendText(`Upcoming set: ${upcomingSetName}`, officialHeadlines),
    '',
    renderTrendText('Latest content from favorite creators', fallbackCreatorSpotlights),
    '',
    renderDeckListText('Best decks for sale', bestDecksForSale),
    '',
    renderDeckListText('Latest decks for sale', latestDecksForSale),
    '',
    renderSalesText('Latest sales', latestSales),
    '',
    renderDeckListText('Recently completed deck moves', completedDeckMoves),
    '',
    `${ctaLabel}: ${ctaUrl}`,
    '',
    'You are receiving this because you opted in to DeckSwap marketing email.',
    'Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}',
  ].join('\n')

  return {
    subject,
    previewText,
    name: `DeckSwap newsletter | ${formatShortDate(new Date().toISOString())}`,
    body,
    html,
    text,
    ctaLabel,
    ctaUrl,
    sections,
  }
}
