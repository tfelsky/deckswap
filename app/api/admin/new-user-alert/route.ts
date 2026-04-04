import { NextResponse } from 'next/server'
import {
  getAppBaseUrl,
  getSuperadminNotificationEmail,
  sendTransactionalEmail,
} from '@/lib/email'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string
      userId?: string | null
    }

    const email = String(body.email ?? '').trim().toLowerCase()
    const userId = String(body.userId ?? '').trim() || 'Not returned by signup flow'

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    }

    const superadminEmail = getSuperadminNotificationEmail()
    const baseUrl = getAppBaseUrl()
    const subject = `New Mythiverse Exchange signup: ${email}`
    const text = [
      'A new user has registered on Mythiverse Exchange.',
      '',
      `Email: ${email}`,
      `User ID: ${userId}`,
      '',
      `Review queue: ${baseUrl}/admin/approvals`,
      `Verification queue: ${baseUrl}/admin/verifications`,
    ].join('\n')

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin: 0 0 16px;">New user registered</h2>
        <p style="margin: 0 0 16px;">
          A new user has created a Mythiverse Exchange account.
        </p>
        <div style="margin: 0 0 20px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 12px; background: #f9fafb;">
          <div><strong>Email:</strong> ${email}</div>
          <div style="margin-top: 8px;"><strong>User ID:</strong> ${userId}</div>
        </div>
        <p style="margin: 0 0 10px;">
          <a href="${baseUrl}/admin/approvals">Open user approvals</a>
        </p>
        <p style="margin: 0;">
          <a href="${baseUrl}/admin/verifications">Open verification queue</a>
        </p>
      </div>
    `

    await sendTransactionalEmail({
      to: superadminEmail,
      subject,
      text,
      html,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to send new-user alert email:', error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to send alert email.',
      },
      { status: 500 }
    )
  }
}
