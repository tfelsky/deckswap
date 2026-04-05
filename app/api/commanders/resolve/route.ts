import { NextResponse } from 'next/server'

import { resolveLegendaryCommanderName } from '@/lib/scryfall/commanders'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string
    }

    const name = String(body.name ?? '').trim()

    if (!name) {
      return NextResponse.json(
        { error: 'Enter the legendary creature you want to build next.' },
        { status: 400 }
      )
    }

    const result = await resolveLegendaryCommanderName(name)

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Could not validate that commander name right now.',
      },
      { status: 422 }
    )
  }
}
