import { NextResponse } from 'next/server'

import { refreshCommanderDirectory } from '@/lib/commanders/directory'

function isAuthorized(request: Request) {
  const authHeader = request.headers.get('authorization')?.trim()
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  const cronSecret = process.env.CRON_SECRET?.trim()

  return !!cronSecret && bearer === cronSecret
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await refreshCommanderDirectory()
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Commander sync failed.',
      },
      { status: 500 }
    )
  }
}
