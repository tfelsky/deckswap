const SUPERADMIN_EMAIL =
  Deno.env.get('SUPERADMIN_NOTIFICATION_EMAIL')?.trim() || 'tim.felsky@gmail.com'
const SITE_URL =
  Deno.env.get('SITE_URL')?.trim() || Deno.env.get('NEXT_PUBLIC_SITE_URL')?.trim() || 'https://mythivex.com'
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')?.trim()
const RESEND_FROM_EMAIL =
  Deno.env.get('RESEND_FROM_EMAIL')?.trim() ||
  'Mythiverse Exchange <notifications@mythivex.com>'

type DatabaseWebhookPayload = {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  schema: string
  record: Record<string, unknown> | null
  old_record: Record<string, unknown> | null
}

function htmlEscape(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  if (!RESEND_API_KEY) {
    return new Response('RESEND_API_KEY is not configured.', { status: 500 })
  }

  const payload = (await request.json()) as DatabaseWebhookPayload
  const record = payload.record ?? {}
  const email = String(record.email ?? '').trim().toLowerCase()
  const userId = String(record.id ?? '').trim() || 'Unknown user id'

  if (payload.type !== 'INSERT' || payload.schema !== 'auth' || payload.table !== 'users' || !email) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const subject = `New Mythiverse Exchange signup: ${email}`
  const text = [
    'A new user has registered on Mythiverse Exchange.',
    '',
    `Email: ${email}`,
    `User ID: ${userId}`,
    '',
    `Review queue: ${SITE_URL}/admin/approvals`,
    `Verification queue: ${SITE_URL}/admin/verifications`,
  ].join('\n')
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="margin: 0 0 16px;">New user registered</h2>
      <p style="margin: 0 0 16px;">
        A new user has created a Mythiverse Exchange account.
      </p>
      <div style="margin: 0 0 20px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 12px; background: #f9fafb;">
        <div><strong>Email:</strong> ${htmlEscape(email)}</div>
        <div style="margin-top: 8px;"><strong>User ID:</strong> ${htmlEscape(userId)}</div>
      </div>
      <p style="margin: 0 0 10px;">
        <a href="${SITE_URL}/admin/approvals">Open user approvals</a>
      </p>
      <p style="margin: 0;">
        <a href="${SITE_URL}/admin/verifications">Open verification queue</a>
      </p>
    </div>
  `

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: [SUPERADMIN_EMAIL],
      subject,
      text,
      html,
    }),
  })

  if (!resendResponse.ok) {
    const body = await resendResponse.text()
    return new Response(
      JSON.stringify({
        ok: false,
        error: `Resend request failed: ${resendResponse.status} ${body}`.slice(0, 500),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  const resendJson = await resendResponse.json()

  return new Response(JSON.stringify({ ok: true, resend: resendJson }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
