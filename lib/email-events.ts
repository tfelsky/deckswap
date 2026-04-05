import { getAppBaseUrl, sendTransactionalEmail } from '@/lib/email'
import { createAdminClientOrNull } from '@/lib/supabase/admin'

type AuthUserRecord = {
  id: string
  email?: string | null
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

async function lookupAuthEmail(userId: string) {
  const supabase = createAdminClientOrNull()

  if (!supabase) {
    console.warn('Skipping outbound email because SUPABASE_SERVICE_ROLE_KEY is not configured.', {
      userId,
    })
    return null
  }

  const result = await supabase.auth.admin.getUserById(userId)
  const user = (result.data?.user ?? null) as AuthUserRecord | null

  if (!user?.email?.trim()) {
    console.warn('Skipping outbound email because the auth user has no email.', {
      userId,
    })
    return null
  }

  return user.email.trim().toLowerCase()
}

function buildEmailHtml({
  eyebrow,
  heading,
  body,
  ctaHref,
  ctaLabel,
}: {
  eyebrow: string
  heading: string
  body: string
  ctaHref: string
  ctaLabel: string
}) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; background: #f9fafb; padding: 24px;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 18px; overflow: hidden;">
        <div style="padding: 24px 24px 12px;">
          <div style="display: inline-block; border-radius: 999px; background: #ecfdf5; color: #047857; padding: 6px 12px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">
            ${escapeHtml(eyebrow)}
          </div>
          <h1 style="margin: 18px 0 12px; font-size: 24px; line-height: 1.25; color: #111827;">
            ${escapeHtml(heading)}
          </h1>
          <p style="margin: 0 0 20px; font-size: 15px; color: #374151;">
            ${escapeHtml(body)}
          </p>
          <a href="${ctaHref}" style="display: inline-block; background: #34d399; color: #111827; text-decoration: none; font-weight: 700; border-radius: 12px; padding: 12px 18px;">
            ${escapeHtml(ctaLabel)}
          </a>
        </div>
        <div style="padding: 16px 24px 24px; font-size: 13px; color: #6b7280;">
          Mythiverse Exchange sent this because it relates to an active marketplace event on your account.
        </div>
      </div>
    </div>
  `
}

export async function sendUserTransactionalEmailById(input: {
  userId: string
  subject: string
  body: string
  href: string
  ctaLabel: string
  idempotencyKey: string
  eyebrow?: string
}) {
  const email = await lookupAuthEmail(input.userId)

  if (!email) return null

  const baseUrl = getAppBaseUrl()
  const absoluteHref = input.href.startsWith('http')
    ? input.href
    : `${baseUrl}${input.href}`

  return sendTransactionalEmail({
    to: email,
    subject: input.subject,
    text: `${input.body}\n\n${input.ctaLabel}: ${absoluteHref}`,
    html: buildEmailHtml({
      eyebrow: input.eyebrow ?? 'Account update',
      heading: input.subject,
      body: input.body,
      ctaHref: absoluteHref,
      ctaLabel: input.ctaLabel,
    }),
    idempotencyKey: input.idempotencyKey,
  })
}
