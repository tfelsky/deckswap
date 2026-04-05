import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/access'
import { syncResendTemplates } from '@/lib/resend-templates'

export async function POST() {
  try {
    await requireAdmin()
    const templates = await syncResendTemplates()

    return NextResponse.json({
      ok: true,
      templates,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to sync Resend templates.',
      },
      { status: 500 }
    )
  }
}
