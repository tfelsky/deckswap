import { getMarketingAudienceContacts } from '@/lib/email-audience'
import { getAppBaseUrl, getEmailConfigSnapshot } from '@/lib/email'
import { getResendClient } from '@/lib/resend'

export type NurtureStep = {
  day: number
  slug: string
  subject: string
  previewText: string
  body: string
  ctaLabel: string
  ctaPath: string
}

type MarketingContact = Awaited<ReturnType<typeof getMarketingAudienceContacts>>[number]

const TEN_DAY_NURTURE_SEQUENCE: NurtureStep[] = [
  {
    day: 0,
    slug: 'welcome-and-first-win',
    subject: 'Welcome to DeckSwap: get your first deck live',
    previewText: 'Start with one deck and one clean listing.',
    body:
      'Welcome to DeckSwap. The fastest path to momentum is simple: import one real deck, make the title and image feel trustworthy, and get it live. You do not need a perfect catalog before you learn what people respond to.',
    ctaLabel: 'Import your first deck',
    ctaPath: '/import-deck',
  },
  {
    day: 1,
    slug: 'finish-your-profile',
    subject: 'Day 1: finish the profile details that build trust',
    previewText: 'A complete profile makes offers easier to say yes to.',
    body:
      'People decide faster when your trader profile feels complete. Add a display name, ship-from country, and at least one external marketplace link so the account feels like a real person behind the inventory.',
    ctaLabel: 'Complete profile',
    ctaPath: '/settings/profile',
  },
  {
    day: 2,
    slug: 'make-one-deck-trade-ready',
    subject: 'Day 2: turn one deck into a trade-ready listing',
    previewText: 'You only need one clear listing to start learning.',
    body:
      'Pick one deck and make it obviously ready for trading. Clean image, solid commander metadata, and a believable value signal are enough to start attracting the right comparisons and first offers.',
    ctaLabel: 'Open my decks',
    ctaPath: '/my-decks',
  },
  {
    day: 3,
    slug: 'understand-offers',
    subject: 'Day 3: how to evaluate trade offers without overthinking them',
    previewText: 'Use fit, value, and trust instead of chasing perfect symmetry.',
    body:
      'A good offer is not just about totals matching exactly. Look at deck fit, card condition, shipping confidence, and how quickly the other trader seems ready to move. The goal is a trade you are actually happy to complete.',
    ctaLabel: 'Review trade offers',
    ctaPath: '/trade-offers',
  },
  {
    day: 4,
    slug: 'use-deck-swap-first',
    subject: 'Day 4: why Deck Swap is usually the best first lane',
    previewText: 'Trade first, then use Buy It Now if needed.',
    body:
      'For many decks, Deck Swap is the lowest-friction way to unlock value because it turns inventory you already have into inventory you actually want. If the right trade does not appear, that is when direct sale paths become more useful.',
    ctaLabel: 'Browse trade matches',
    ctaPath: '/trade-matches',
  },
  {
    day: 5,
    slug: 'cash-equalization',
    subject: 'Day 5: use cash equalization to save more trades',
    previewText: 'Small value gaps do not need to kill a good trade.',
    body:
      'A lot of promising trades die because the totals are close but not perfect. Cash equalization is there to close that gap without forcing either side into the wrong deck just to hit a cleaner number.',
    ctaLabel: 'Explore listings',
    ctaPath: '/decks',
  },
  {
    day: 6,
    slug: 'trust-and-shipping',
    subject: 'Day 6: trust, shipping, and what makes people actually follow through',
    previewText: 'Trust signals matter more than another paragraph of copy.',
    body:
      'The traders who close deals tend to make logistics feel easy. Keep your shipping details current, state what country you ship from, and reduce uncertainty wherever you can. Trust usually shows up as clarity more than persuasion.',
    ctaLabel: 'Update shipping profile',
    ctaPath: '/settings/profile',
  },
  {
    day: 7,
    slug: 'price-and-positioning',
    subject: 'Day 7: price and position your inventory like a real seller',
    previewText: 'You are not just listing cards; you are reducing friction.',
    body:
      'Pricing is only one part of the decision. Inventory quality, presentation, trade flexibility, and responsiveness all affect whether a deck moves. A slightly less aggressive listing can still win if it feels easier and safer to transact.',
    ctaLabel: 'Review my inventory',
    ctaPath: '/my-decks',
  },
  {
    day: 8,
    slug: 'reactivate-dormant-listings',
    subject: 'Day 8: if a listing is quiet, change the angle not just the number',
    previewText: 'Refresh stale listings with stronger context.',
    body:
      'If a deck has gone quiet, do not only nudge the value. Improve the image, tighten the title, make the deck state clearer, or open it up to a better class of trade counterpart. Fresh context often works better than a small price cut.',
    ctaLabel: 'Refresh a listing',
    ctaPath: '/my-decks',
  },
  {
    day: 9,
    slug: 'next-10-days',
    subject: 'Day 9: your next 10 days on DeckSwap',
    previewText: 'Keep the flywheel moving with one simple operating rhythm.',
    body:
      'Going forward, the operating rhythm is simple: keep one deck trade-ready, answer offers quickly, and improve trust signals every week. You do not need dozens of active listings to make the marketplace work for you consistently.',
    ctaLabel: 'Open DeckSwap',
    ctaPath: '/decks',
  },
]

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

function buildManagePreferencesUrl() {
  return `${getAppBaseUrl()}/settings/profile`
}

function renderNurtureHtml(step: NurtureStep) {
  const baseUrl = getAppBaseUrl()
  const ctaUrl = `${baseUrl}${step.ctaPath}`
  const preferencesUrl = buildManagePreferencesUrl()

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; background: #f9fafb; padding: 24px;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 18px; overflow: hidden;">
        <div style="padding: 24px 24px 12px;">
          <div style="display: inline-block; border-radius: 999px; background: #eff6ff; color: #1d4ed8; padding: 6px 12px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">
            10-day nurture
          </div>
          <h1 style="margin: 18px 0 12px; font-size: 24px; line-height: 1.25; color: #111827;">
            ${step.subject}
          </h1>
          <p style="margin: 0 0 20px; font-size: 15px; color: #374151;">
            ${step.body}
          </p>
          <a href="${ctaUrl}" style="display: inline-block; background: #34d399; color: #111827; text-decoration: none; font-weight: 700; border-radius: 12px; padding: 12px 18px;">
            ${step.ctaLabel}
          </a>
        </div>
        <div style="padding: 16px 24px 24px; font-size: 13px; color: #6b7280;">
          You are receiving this because you opted in to DeckSwap marketplace updates.
          <a href="${preferencesUrl}" style="color: #2563eb;">Manage email preferences</a>.
        </div>
      </div>
    </div>
  `
}

function renderNurtureText(step: NurtureStep) {
  return `${step.subject}\n\n${step.body}\n\n${step.ctaLabel}: ${getAppBaseUrl()}${step.ctaPath}\n\nManage email preferences: ${buildManagePreferencesUrl()}`
}

export function getTenDayNurtureSequence() {
  return TEN_DAY_NURTURE_SEQUENCE
}

export async function previewTenDayNurture(startAt?: string | null) {
  const anchor = startAt?.trim() ? new Date(startAt) : new Date()
  const startDate = Number.isNaN(anchor.getTime()) ? new Date() : anchor

  return TEN_DAY_NURTURE_SEQUENCE.map((step) => ({
    ...step,
    scheduledAt: addDays(startDate, step.day).toISOString(),
  }))
}

async function resolveOptedInContact(input: {
  userId?: string | null
  email?: string | null
}) {
  const normalizedEmail = input.email?.trim().toLowerCase() || null
  const contacts = await getMarketingAudienceContacts()

  return (
    contacts.find((contact) => {
      if (input.userId?.trim() && contact.userId === input.userId.trim()) return true
      if (normalizedEmail && contact.email.toLowerCase() === normalizedEmail) return true
      return false
    }) ?? null
  )
}

export async function queueTenDayNurtureSequence(input: {
  userId?: string | null
  email?: string | null
  startAt?: string | null
}) {
  const contact = await resolveOptedInContact(input)

  if (!contact) {
    throw new Error(
      'No opted-in marketing contact matched that user ID or email. Make sure the user has marketing opt-in enabled before queuing nurture.'
    )
  }

  const resend = getResendClient()
  const emailConfig = getEmailConfigSnapshot()
  const preview = await previewTenDayNurture(input.startAt)
  const queued: Array<{
    day: number
    subject: string
    scheduledAt: string
    emailId: string
  }> = []

  for (const step of preview) {
    const result = await resend.emails.send(
      {
        from: emailConfig.marketingFromEmail,
        to: contact.email,
        subject: step.subject,
        html: renderNurtureHtml(step),
        text: renderNurtureText(step),
        scheduledAt: step.scheduledAt,
        tags: [
          { name: 'purpose', value: 'marketing' },
          { name: 'sequence', value: 'signup-10-day-nurture' },
          { name: 'sequence_day', value: String(step.day) },
        ],
      },
      {
        idempotencyKey: `nurture:v1:${contact.email}:${step.slug}:${step.scheduledAt}`,
      }
    )

    if (result.error || !result.data?.id) {
      throw new Error(
        `Failed to queue nurture email for day ${step.day}: ${result.error?.message ?? 'Unknown error'}`
      )
    }

    queued.push({
      day: step.day,
      subject: step.subject,
      scheduledAt: step.scheduledAt,
      emailId: result.data.id,
    })
  }

  return {
    contact: {
      userId: contact.userId,
      email: contact.email,
      displayLabel: contact.displayLabel,
    },
    queued,
  }
}
