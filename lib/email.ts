const DEFAULT_SUPERADMIN_EMAIL = 'tim.felsky@gmail.com'

export function getSuperadminNotificationEmail() {
  return process.env.SUPERADMIN_NOTIFICATION_EMAIL?.trim() || DEFAULT_SUPERADMIN_EMAIL
}

export function getAppBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.APP_BASE_URL?.trim() ||
    'https://mythivex.com'
  )
}

export async function sendTransactionalEmail(input: {
  to: string | string[]
  subject: string
  text: string
  html: string
  from?: string
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim()

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured.')
  }

  const from =
    input.from?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    'Mythiverse Exchange <notifications@mythivex.com>'

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Resend request failed: ${response.status} ${body}`.slice(0, 400))
  }

  return response.json()
}
