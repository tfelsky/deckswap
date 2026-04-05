import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/access'
import { buildMarketplaceNewsletterDraft } from '@/lib/marketing-newsletter'
import { createMarketingBroadcast } from '@/lib/resend-marketing'

export async function POST(request: Request) {
  try {
    await requireAdmin()

    const body = (await request.json().catch(() => ({}))) as {
      action?: 'preview' | 'create_broadcast'
      upcomingSetName?: string
      creatorFilters?: string
      send?: boolean
      scheduledAt?: string
    }

    const creatorFilters = String(body.creatorFilters ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)

    const draft = await buildMarketplaceNewsletterDraft({
      upcomingSetName: String(body.upcomingSetName ?? '').trim() || undefined,
      creatorFilters,
    })

    if (body.action === 'preview' || !body.action) {
      return NextResponse.json({
        ok: true,
        action: 'preview',
        draft,
      })
    }

    if (body.action !== 'create_broadcast') {
      return NextResponse.json(
        {
          ok: false,
          error: 'action must be preview or create_broadcast.',
        },
        { status: 400 }
      )
    }

    const broadcast = await createMarketingBroadcast({
      subject: draft.subject,
      body: draft.body,
      previewText: draft.previewText,
      ctaLabel: draft.ctaLabel,
      ctaUrl: draft.ctaUrl,
      html: draft.html,
      text: draft.text,
      name: draft.name,
      send: body.send === true,
      scheduledAt: String(body.scheduledAt ?? '').trim() || undefined,
    })

    return NextResponse.json({
      ok: true,
      action: 'create_broadcast',
      draft,
      broadcast,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate newsletter broadcast.',
      },
      { status: 500 }
    )
  }
}
