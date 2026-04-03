import type { ImportedDeckCard } from './types'

function normalizeLine(line: string) {
  return line.trim().replace(/\s+/g, ' ')
}

function splitDelimitedLine(line: string, delimiter: string) {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i++
        continue
      }

      inQuotes = !inQuotes
      continue
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  cells.push(current.trim())
  return cells
}

function normalizeHeader(header: string) {
  return header.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function getFirstValue(
  row: Record<string, string>,
  keys: string[]
) {
  for (const key of keys) {
    const value = row[key]
    if (value) return value
  }

  return ''
}

function parseFoilValue(value: string) {
  const normalized = value.trim().toLowerCase()
  return (
    normalized === 'foil' ||
    normalized === 'true' ||
    normalized === 'yes' ||
    normalized === 'y' ||
    normalized === '1'
  )
}

function inferSectionFromArchidektRow(
  row: Record<string, string>
): 'commander' | 'mainboard' | 'token' {
  const category = getFirstValue(row, [
    'category',
    'categories',
    'section',
    'group',
    'groups',
    'board',
  ]).toLowerCase()

  if (
    category.includes('token') ||
    category.includes('emblem') ||
    category.includes('helper')
  ) {
    return 'token'
  }

  if (category.includes('commander')) {
    return 'commander'
  }

  return 'mainboard'
}

function parseArchidektTable(input: string): ImportedDeckCard[] {
  const lines = input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) return []

  const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(',') ? ',' : null
  if (!delimiter) return []

  const headers = splitDelimitedLine(lines[0], delimiter).map(normalizeHeader)

  const quantityIndex = headers.findIndex((header) =>
    ['quantity', 'qty', 'count'].includes(header)
  )
  const nameIndex = headers.findIndex((header) =>
    ['card', 'name', 'cardname'].includes(header)
  )

  if (quantityIndex === -1 || nameIndex === -1) {
    return []
  }

  const cards: ImportedDeckCard[] = []

  for (const line of lines.slice(1)) {
    const values = splitDelimitedLine(line, delimiter)
    const row = Object.fromEntries(
      headers.map((header, index) => [header, values[index]?.trim() ?? ''])
    )

    const quantity = Number(row[headers[quantityIndex]])
    const cardName = row[headers[nameIndex]]?.trim()

    if (!quantity || !cardName) continue

    cards.push({
      section: inferSectionFromArchidektRow(row),
      quantity,
      cardName,
      foil: parseFoilValue(
        getFirstValue(row, ['foil', 'finish', 'printing', 'iscardfoil'])
      ),
      setCode:
        getFirstValue(row, ['setcode', 'set', 'editioncode']).toLowerCase() || undefined,
      setName: getFirstValue(row, ['setname', 'edition', 'editionname']) || undefined,
      collectorNumber:
        getFirstValue(row, ['collectornumber', 'number', 'cn']) || undefined,
    })
  }

  return cards
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

export function parseDeckText(input: string, sourceType = 'text'): ImportedDeckCard[] {
  if (sourceType.toLowerCase() === 'archidekt') {
    const archidektCards = parseArchidektTable(input)
    if (archidektCards.length > 0) {
      return archidektCards
    }
  }

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
