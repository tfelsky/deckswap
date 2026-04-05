import { NextResponse } from 'next/server'

import { searchCommanderDirectory } from '@/lib/commanders/directory'
import { fetchLiveCommanderSuggestions } from '@/lib/scryfall/commanders'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim() ?? ''

  if (!query) {
    return NextResponse.json({ suggestions: [] })
  }

  try {
    const cachedSuggestions = await searchCommanderDirectory(query, 8)

    if (cachedSuggestions.length > 0) {
      return NextResponse.json({
        suggestions: cachedSuggestions.map((entry) => entry.name),
        source: 'cache',
      })
    }
  } catch {
    // Fall through to live Scryfall suggestions if the local cache is not ready yet.
  }

  try {
    const suggestions = await fetchLiveCommanderSuggestions(query, 8)

    return NextResponse.json({
      suggestions,
      source: 'scryfall',
    })
  } catch (error) {
    return NextResponse.json(
      {
        suggestions: [],
        source: 'error',
        error:
          error instanceof Error ? error.message : 'Could not load commander suggestions right now.',
      },
      { status: 500 }
    )
  }
}
