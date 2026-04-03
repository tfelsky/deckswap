import type { ImportedDeckCard } from './types'

function normalizeLine(line: string) {
  return line.trim().replace(/\s+/g, ' ')
}

function parseCardLine(
  line: string,
  currentSection: 'commander' | 'mainboard' | 'token'
): ImportedDeckCard | null {
  const cleaned = normalizeLine(line)

  if (!cleaned) return null
  if (cleaned.startsWith('//')) return null

  // Supports:
  // 1 Sol Ring
  // 1x Sol Ring
  // 28x Plains (fdn) 273
  // 1x Adventurer's Inn (fin) 271 *F*
  // 1 Leonin Relic-Warder (plst) C17-65
  const qtyMatch = cleaned.match(/^(\d+)x?\s+(.+)$/i)
  if (!qtyMatch) return null

  const quantity = Number(qtyMatch[1])
  let rest = qtyMatch[2].trim()

  let foil = false
  if (/\*F\*$/i.test(rest)) {
    foil = true
    rest = rest.replace(/\*F\*$/i, '').trim()
  }

  let setCode: string | undefined
  let collectorNumber: string | undefined

  // Match formats like:
  // Sol Ring (eoc) 57
  // Leonin Relic-Warder (plst) C17-65
  const printMatch = rest.match(/^(.*?)\s+\(([a-z0-9]+)\)\s+([a-z0-9\-]+)$/i)
  if (printMatch) {
    rest = printMatch[1].trim()
    setCode = printMatch[2].toLowerCase()
    collectorNumber = printMatch[3]
  }

  return {
    section: currentSection,
    quantity,
    cardName: rest,
    foil,
    setCode,
    collectorNumber,
  }
}

export function parseDeckText(input: string): ImportedDeckCard[] {
  const lines = input.split('\n')

  let currentSection: 'commander' | 'mainboard' | 'token' = 'mainboard'
  const cards: ImportedDeckCard[] = []

  for (const raw of lines) {
    const line = normalizeLine(raw)
    if (!line) continue

    const lower = line.toLowerCase()

    if (lower === 'commander' || lower === 'commanders') {
      currentSection = 'commander'
      continue
    }

    if (
      lower === 'mainboard' ||
      lower === 'deck' ||
      lower === '99' ||
      lower === '98' ||
      lower === 'maindeck'
    ) {
      currentSection = 'mainboard'
      continue
    }

    if (lower === 'tokens' || lower === 'token') {
      currentSection = 'token'
      continue
    }

    const parsed = parseCardLine(line, currentSection)
    if (parsed) {
      cards.push(parsed)
    }
  }

  return cards
}