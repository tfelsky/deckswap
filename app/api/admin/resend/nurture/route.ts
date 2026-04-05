import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/access'
import {
  previewTenDayNurture,
  queueTenDayNurtureSequence,
} from '@/lib/marketing-nurture'

export async function POST(request: Request) {
  try {
    await requireAdmin()

    const body = (await request.json().catch(() => ({}))) as {
      action?: 'preview' | 'queue'
      userId?: string
      email?: string
      startAt?: string
    }

    if (body.action === 'preview') {
      const sequence = await previewTenDayNurture(body.startAt)

      return NextResponse.json({
        ok: true,
        action: 'preview',
        sequence,
      })
    }

    if (body.action !== 'queue') {
      return NextResponse.json(
        {
          ok: false,
          error: 'action must be preview or queue.',
        },
        { status: 400 }
      )
    }

    if (!String(body.userId ?? '').trim() && !String(body.email ?? '').trim()) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Provide a userId or email to queue the nurture sequence.',
        },
        { status: 400 }
      )
    }

    const queued = await queueTenDayNurtureSequence({
      userId: String(body.userId ?? '').trim() || undefined,
      email: String(body.email ?? '').trim() || undefined,
      startAt: String(body.startAt ?? '').trim() || undefined,
    })

    return NextResponse.json({
      ok: true,
      action: 'queue',
      queued,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to manage nurture sequence.',
      },
      { status: 500 }
    )
  }
}
