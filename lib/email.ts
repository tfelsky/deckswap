import { getResendClient } from '@/lib/resend'

const DEFAULT_SUPERADMIN_EMAIL = 'tim.felsky@gmail.com'
const DEFAULT_APP_BASE_URL = 'https://mythivex.com'
const DEFAULT_TRANSACTIONAL_FROM = 'Mythiverse Exchange <notifications@mythivex.com>'
const DEFAULT_MARKETING_FROM = 'Mythiverse Exchange <updates@mythivex.com>'

export type EmailPurpose = 'transactional' | 'marketing' | 'internal'

export type SendEmailInput = {
  to: string | string[]
  subject: string
  text: string
  html: string
  from?: string
  purpose?: EmailPurpose
  idempotencyKey?: string
}

export type EmailConfigSnapshot = {
  appBaseUrl: string
  resendApiKeyConfigured: boolean
  resendApiKeyPrefix: string | null
  resendMarketingTopicConfigured: boolean
  defaultFromEmail: string
  transactionalFromEmail: string
  marketingFromEmail: string
  superadminNotificationEmail: string
  usingFallbackSuperadminEmail: boolean
}

function parseConfiguredEmail(value?: string | null, fallback?: string) {
  const normalized = value?.trim()

  if (normalized) return normalized
  return fallback?.trim() || ''
}

function parseFromDomain(fromEmail: string) {
  const match = fromEmail.match(/<([^>]+)>/)
  const emailAddress = match ? match[1] : fromEmail
  const [, domain] = emailAddress.split('@')

  return domain?.trim().toLowerCase() || null
}

function purposeLabel(purpose: EmailPurpose) {
  switch (purpose) {
    case 'marketing':
      return 'marketing'
    case 'internal':
      return 'internal'
    default:
      return 'transactional'
  }
}

export function getSuperadminNotificationEmail() {
  return parseConfiguredEmail(
    process.env.SUPERADMIN_NOTIFICATION_EMAIL,
    DEFAULT_SUPERADMIN_EMAIL
  )
}

export function getAppBaseUrl() {
  return parseConfiguredEmail(
    process.env.NEXT_PUBLIC_SITE_URL,
    parseConfiguredEmail(process.env.APP_BASE_URL, DEFAULT_APP_BASE_URL)
  )
}

export function getEmailConfigSnapshot(): EmailConfigSnapshot {
  const defaultFromEmail = parseConfiguredEmail(
    process.env.RESEND_FROM_EMAIL,
    DEFAULT_TRANSACTIONAL_FROM
  )
  const transactionalFromEmail = parseConfiguredEmail(
    process.env.RESEND_TRANSACTIONAL_FROM_EMAIL,
    defaultFromEmail || DEFAULT_TRANSACTIONAL_FROM
  )
  const marketingFromEmail = parseConfiguredEmail(
    process.env.RESEND_MARKETING_FROM_EMAIL,
    defaultFromEmail || DEFAULT_MARKETING_FROM
  )
  const superadminNotificationEmail = getSuperadminNotificationEmail()
  const apiKey = process.env.RESEND_API_KEY?.trim() || ''
  const marketingTopicId = process.env.RESEND_MARKETING_TOPIC_ID?.trim() || ''

  return {
    appBaseUrl: getAppBaseUrl(),
    resendApiKeyConfigured: apiKey.length > 0,
    resendApiKeyPrefix: apiKey ? apiKey.slice(0, 3) : null,
    resendMarketingTopicConfigured: marketingTopicId.length > 0,
    defaultFromEmail,
    transactionalFromEmail,
    marketingFromEmail,
    superadminNotificationEmail,
    usingFallbackSuperadminEmail:
      superadminNotificationEmail === DEFAULT_SUPERADMIN_EMAIL,
  }
}

export function getEmailHealthReport() {
  const config = getEmailConfigSnapshot()
  const recommendations: string[] = []
  const warnings: string[] = []

  if (!config.resendApiKeyConfigured) {
    warnings.push('RESEND_API_KEY is missing, so no outbound email can be sent.')
  }

  const transactionalDomain = parseFromDomain(config.transactionalFromEmail)
  const marketingDomain = parseFromDomain(config.marketingFromEmail)

  if (transactionalDomain?.endsWith('resend.dev') || marketingDomain?.endsWith('resend.dev')) {
    warnings.push('A resend.dev sender is best kept for testing; switch to your verified domain for production deliverability.')
  }

  if (
    config.transactionalFromEmail.trim().toLowerCase() ===
    config.marketingFromEmail.trim().toLowerCase()
  ) {
    recommendations.push(
      'Use separate from addresses for transactional and marketing email so reputation issues do not spill across traffic types.'
    )
  }

  if (transactionalDomain && marketingDomain && transactionalDomain === marketingDomain) {
    recommendations.push(
      'Consider separate subdomains for transactional and marketing mail if your volume grows, for example notifications.yourdomain.com and updates.yourdomain.com.'
    )
  }

  if (!config.resendMarketingTopicConfigured) {
    recommendations.push(
      'Set RESEND_MARKETING_TOPIC_ID so broadcasts use a Resend Topic for preference management and unsubscribe scoping.'
    )
  }

  if (config.usingFallbackSuperadminEmail) {
    recommendations.push(
      'Set SUPERADMIN_NOTIFICATION_EMAIL explicitly so operational alerts do not depend on the hardcoded fallback address.'
    )
  }

  return {
    config,
    warnings,
    recommendations,
    deliverabilityReady:
      config.resendApiKeyConfigured &&
      !warnings.some((warning) => warning.includes('missing')),
  }
}

function resolveFromAddress(purpose: EmailPurpose, inputFrom?: string) {
  if (inputFrom?.trim()) return inputFrom.trim()

  const config = getEmailConfigSnapshot()

  switch (purpose) {
    case 'marketing':
      return config.marketingFromEmail
    case 'internal':
      return config.transactionalFromEmail
    default:
      return config.transactionalFromEmail
  }
}

async function sendEmail(input: SendEmailInput) {
  const purpose = input.purpose ?? 'transactional'
  const from = resolveFromAddress(purpose, input.from)
  const resend = getResendClient()
  const response = await resend.emails.send(
    {
      from,
      to: Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
      tags: [
        { name: 'purpose', value: purposeLabel(purpose) },
      ],
    },
    {
      idempotencyKey: input.idempotencyKey?.trim() || undefined,
    }
  )

  if (response.error) {
    throw new Error(
      `Resend ${purposeLabel(purpose)} email failed: ${response.error.statusCode ?? 'unknown'} ${response.error.message}`.slice(
        0,
        400
      )
    )
  }

  return response.data
}

export async function sendTransactionalEmail(
  input: Omit<SendEmailInput, 'purpose'>
) {
  return sendEmail({
    ...input,
    purpose: 'transactional',
  })
}

export async function sendMarketingEmail(
  input: Omit<SendEmailInput, 'purpose'>
) {
  return sendEmail({
    ...input,
    purpose: 'marketing',
  })
}
