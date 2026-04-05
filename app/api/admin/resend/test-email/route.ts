import { NextResponse } from 'next/server'
import { getSuperadminNotificationEmail, sendTransactionalEmail } from '@/lib/email'
import { requireAdmin } from '@/lib/admin/access'

export async function POST(request: Request) {
  try {
    await requireAdmin()

    const body = (await request.json().catch(() => ({}))) as {
      to?: string
      subject?: string
      message?: string
    }

    const to = String(body.to ?? '').trim() || getSuperadminNotificationEmail()
    const subject = String(body.subject ?? '').trim() || 'DeckSwap test email'
    const message =
      String(body.message ?? '').trim() ||
      'This is a test email from the DeckSwap Resend integration.'

    const result = await sendTransactionalEmail({
      to,
      subject,
      text: `${message}\n\nSent at: ${new Date().toISOString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h1 style="margin: 0 0 16px;">${subject}</h1>
          <p style="margin: 0 0 12px;">${message}</p>
          <p style="margin: 0; color: #6b7280;">Sent at: ${new Date().toISOString()}</p>
        </div>
      `,
      idempotencyKey: `admin-test-email:${to}:${Date.now()}`,
    })

    return NextResponse.json({
      ok: true,
      to,
      subject,
      result,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to send test email.',
      },
      { status: 500 }
    )
  }
}
