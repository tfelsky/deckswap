import { NextResponse } from 'next/server'
import { getMarketingAudienceSnapshot } from '@/lib/email-audience'
import { getEmailHealthReport } from '@/lib/email'
import { requireAdmin } from '@/lib/admin/access'

export async function GET() {
  try {
    const { user, access } = await requireAdmin()
    const emailHealth = getEmailHealthReport()

    let audience = null
    let audienceError: string | null = null

    try {
      audience = await getMarketingAudienceSnapshot()
    } catch (error) {
      audienceError =
        error instanceof Error ? error.message : 'Unable to build marketing audience snapshot.'
    }

    return NextResponse.json({
      ok: true,
      requestedAt: new Date().toISOString(),
      requestedBy: user.email ?? user.id,
      access: {
        role: access.role,
        source: access.source,
      },
      emailHealth,
      audience,
      audienceError,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unauthorized',
      },
      { status: 401 }
    )
  }
}
