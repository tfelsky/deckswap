import { getMarketingAudienceContacts } from '@/lib/email-audience'
import { getEmailConfigSnapshot } from '@/lib/email'
import { getResendClient } from '@/lib/resend'

const MARKETING_SEGMENT_NAME = 'deckswap-marketing-opt-in'

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function renderBroadcastHtml(input: {
  subject: string
  body: string
  ctaLabel?: string | null
  ctaUrl?: string | null
}) {
  const ctaBlock =
    input.ctaLabel && input.ctaUrl
      ? `<p style="margin: 24px 0 0;"><a href="${input.ctaUrl}">${input.ctaLabel}</a></p>`
      : ''

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #2563eb;">DeckSwap update</p>
      <h1 style="margin: 12px 0 16px;">${input.subject}</h1>
      <div style="white-space: pre-wrap;">${input.body}</div>
      ${ctaBlock}
    </div>
  `
}

async function ensureMarketingSegment() {
  const resend = getResendClient()
  const segmentList = await resend.segments.list({ limit: 100 })

  if (segmentList.error) {
    throw new Error(`Unable to list Resend segments: ${segmentList.error.message}`)
  }

  const existing = (segmentList.data?.data ?? []).find(
    (segment) => segment.name === MARKETING_SEGMENT_NAME
  )

  if (existing) return existing.id

  const createResult = await resend.segments.create({ name: MARKETING_SEGMENT_NAME })

  if (createResult.error || !createResult.data) {
    throw new Error(
      `Unable to create Resend segment ${MARKETING_SEGMENT_NAME}: ${createResult.error?.message ?? 'Unknown error'}`
    )
  }

  return createResult.data.id
}

export async function syncResendMarketingAudience() {
  const resend = getResendClient()
  const segmentId = await ensureMarketingSegment()
  const contacts = await getMarketingAudienceContacts()

  const synced: string[] = []

  for (const contact of contacts) {
    const existing = await resend.contacts.get({ email: contact.email })

    if (existing.data?.id) {
      const updateResult = await resend.contacts.update({
        id: existing.data.id,
        firstName: contact.firstName || null,
        lastName: contact.lastName || null,
        unsubscribed: false,
      })

      if (updateResult.error) {
        throw new Error(
          `Unable to update Resend contact ${contact.email}: ${updateResult.error.message}`
        )
      }

      const addToSegment = await resend.contacts.segments.add({
        contactId: existing.data.id,
        segmentId,
      })

      if (addToSegment.error && addToSegment.error.name !== 'invalid_parameter') {
        throw new Error(
          `Unable to add Resend contact ${contact.email} to segment: ${addToSegment.error.message}`
        )
      }

      synced.push(contact.email)
      continue
    }

    const createResult = await resend.contacts.create({
      email: contact.email,
      firstName: contact.firstName,
      lastName: contact.lastName,
      unsubscribed: false,
      segments: [{ id: segmentId }],
    })

    if (createResult.error) {
      throw new Error(
        `Unable to create Resend contact ${contact.email}: ${createResult.error.message}`
      )
    }

    synced.push(contact.email)
  }

  return {
    segmentId,
    segmentName: MARKETING_SEGMENT_NAME,
    syncedContacts: synced.length,
    contacts,
  }
}

export async function createMarketingBroadcast(input: {
  subject: string
  body: string
  previewText?: string | null
  ctaLabel?: string | null
  ctaUrl?: string | null
  html?: string | null
  text?: string | null
  send?: boolean
  scheduledAt?: string | null
  name?: string | null
}) {
  const resend = getResendClient()
  const emailConfig = getEmailConfigSnapshot()
  const audience = await syncResendMarketingAudience()
  const html = input.html?.trim() || renderBroadcastHtml(input)
  const text =
    input.text?.trim() ||
    `${input.subject}\n\n${stripHtml(input.body)}${
      input.ctaLabel && input.ctaUrl ? `\n\n${input.ctaLabel}: ${input.ctaUrl}` : ''
    }`

  const createResult = await resend.broadcasts.create({
    segmentId: audience.segmentId,
    from: emailConfig.marketingFromEmail,
    subject: input.subject,
    previewText: input.previewText || undefined,
    html,
    text,
    name: input.name?.trim() || input.subject,
    send: input.send === true,
    scheduledAt: input.send === true ? input.scheduledAt || undefined : undefined,
  } as any)

  if (createResult.error || !createResult.data) {
    throw new Error(
      `Unable to create Resend broadcast: ${createResult.error?.message ?? 'Unknown error'}`
    )
  }

  return {
    id: createResult.data.id,
    audience,
    sendRequested: input.send === true,
  }
}
