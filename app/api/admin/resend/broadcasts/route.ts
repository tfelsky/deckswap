import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/access'
import {
  createMarketingBroadcast,
  syncResendMarketingAudience,
} from '@/lib/resend-marketing'

export async function POST(request: Request) {
  try {
    await requireAdmin()

    const body = (await request.json().catch(() => ({}))) as {
      action?: 'sync_audience' | 'create_broadcast'
      subject?: string
      body?: string
      previewText?: string
      ctaLabel?: string
      ctaUrl?: string
      html?: string
      text?: string
      send?: boolean
      scheduledAt?: string
      name?: string
    }

    if (body.action === 'sync_audience') {
      const audience = await syncResendMarketingAudience()

      return NextResponse.json({
        ok: true,
        action: 'sync_audience',
        audience: {
          ...audience,
          contacts: undefined,
        },
      })
    }

    if (body.action !== 'create_broadcast') {
      return NextResponse.json(
        {
          ok: false,
          error: 'action must be sync_audience or create_broadcast.',
        },
        { status: 400 }
      )
    }

    const subject = String(body.subject ?? '').trim()
    const messageBody = String(body.body ?? '').trim()

    if (!subject || !messageBody) {
      return NextResponse.json(
        {
          ok: false,
          error: 'subject and body are required to create a broadcast.',
        },
        { status: 400 }
      )
    }

    const broadcast = await createMarketingBroadcast({
      subject,
      body: messageBody,
      previewText: String(body.previewText ?? '').trim() || undefined,
      ctaLabel: String(body.ctaLabel ?? '').trim() || undefined,
      ctaUrl: String(body.ctaUrl ?? '').trim() || undefined,
      html: String(body.html ?? '').trim() || undefined,
      text: String(body.text ?? '').trim() || undefined,
      send: body.send === true,
      scheduledAt: String(body.scheduledAt ?? '').trim() || undefined,
      name: String(body.name ?? '').trim() || undefined,
    })

    return NextResponse.json({
      ok: true,
      action: 'create_broadcast',
      broadcast,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to manage Resend broadcast.',
      },
      { status: 500 }
    )
  }
}
