type ScryfallNamedCard = {
  name: string
  oracle_text?: string
  type_line?: string
}

type ScryfallAutocompleteResponse = {
  data?: string[]
}

type ScryfallCollectionCard = {
  name: string
  oracle_text?: string
  type_line?: string
}

function isKnownCommanderCard(card: {
  oracle_text?: string
  type_line?: string
}) {
  const oracle = card.oracle_text?.toLowerCase() || ''
  const typeLine = card.type_line?.toLowerCase() || ''

  return (
    typeLine.includes('legendary creature') ||
    oracle.includes('can be your commander') ||
    oracle.includes('choose a background') ||
    typeLine.includes('background')
  )
}

function normalizeName(value: string) {
  return value.trim().toLowerCase()
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Scryfall request failed: ${response.status}`)
  }

  return (await response.json()) as T
}

async function tryNamedFuzzyLookup(input: string) {
  try {
    return await fetchJson<ScryfallNamedCard>(
      `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(input)}`
    )
  } catch {
    return null
  }
}

async function fetchAutocompleteSuggestions(input: string) {
  try {
    const response = await fetchJson<ScryfallAutocompleteResponse>(
      `https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(input)}`
    )

    return (response.data ?? []).filter(Boolean)
  } catch {
    return []
  }
}

async function fetchCommanderCandidates(names: string[]) {
  if (names.length === 0) return []

  const response = await fetchJson<{ data?: ScryfallCollectionCard[] }>(
    'https://api.scryfall.com/cards/collection',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifiers: names.map((name) => ({ name })),
      }),
    }
  )

  return (response.data ?? []).filter(isKnownCommanderCard)
}

export async function resolveLegendaryCommanderName(input: string) {
  const raw = input.trim()

  if (!raw) {
    throw new Error('Enter the legendary creature you want to build next.')
  }

  const fuzzyCard = await tryNamedFuzzyLookup(raw)
  if (fuzzyCard && isKnownCommanderCard(fuzzyCard)) {
    return {
      commanderName: fuzzyCard.name,
      corrected: normalizeName(fuzzyCard.name) !== normalizeName(raw),
      suggestions: [fuzzyCard.name],
    }
  }

  const suggestions = await fetchAutocompleteSuggestions(raw)
  const commanderCandidates = await fetchCommanderCandidates(suggestions.slice(0, 8))
  const uniqueCandidates = Array.from(new Set(commanderCandidates.map((card) => card.name)))

  if (uniqueCandidates.length > 0) {
    const exactSuggestion =
      uniqueCandidates.find((name) => normalizeName(name) === normalizeName(raw)) ??
      uniqueCandidates[0]

    return {
      commanderName: exactSuggestion,
      corrected: normalizeName(exactSuggestion) !== normalizeName(raw),
      suggestions: uniqueCandidates.slice(0, 5),
    }
  }

  throw new Error(
    'Enter a known legendary creature or commander-legal legend. Try the full card name.'
  )
}

export async function fetchLiveCommanderSuggestions(input: string, limit = 8) {
  const raw = input.trim()

  if (!raw) return []

  const suggestions = await fetchAutocompleteSuggestions(raw)
  const commanderCandidates = await fetchCommanderCandidates(suggestions.slice(0, Math.max(limit, 8)))
  const uniqueCandidates = Array.from(new Set(commanderCandidates.map((card) => card.name)))

  return uniqueCandidates.slice(0, limit)
}
