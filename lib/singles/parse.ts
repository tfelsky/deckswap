import type { ImportedSingleRow } from '@/lib/singles/imports'

function splitDelimitedLine(line: string, delimiter: string) {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
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

function getFirstValue(row: Record<string, string>, keys: string[]) {
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

function parseConditionValue(value: string): ImportedSingleRow['condition'] {
  const normalized = value.trim().toLowerCase()

  switch (normalized) {
    case 'lp':
    case 'lightplay':
    case 'light_play':
      return 'light_play'
    case 'mp':
    case 'moderatelyplayed':
    case 'moderateplay':
    case 'moderate_play':
      return 'moderate_play'
    case 'hp':
    case 'heavilyplayed':
    case 'heavyplay':
    case 'heavy_play':
      return 'heavy_play'
    case 'dmg':
    case 'damaged':
      return 'damaged'
    default:
      return 'near_mint'
  }
}

export function looksLikeArchidektCollectionTable(input: string) {
  const firstLine = input
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean)

  if (!firstLine) return false

  const delimiter = firstLine.includes('\t') ? '\t' : firstLine.includes(',') ? ',' : null
  if (!delimiter) return false

  const normalized = splitDelimitedLine(firstLine, delimiter).map(normalizeHeader)

  const hasQuantity = normalized.some((header) =>
    ['quantity', 'qty', 'count', 'amount'].includes(header)
  )
  const hasName = normalized.some((header) =>
    ['card', 'name', 'cardname', 'cardtitle'].includes(header)
  )

  const hasCollectionSignals = normalized.some((header) =>
    [
      'condition',
      'language',
      'foil',
      'finish',
      'collectornumber',
      'editioncode',
      'setcode',
      'setname',
      'editionname',
    ].includes(header)
  )

  return hasQuantity && hasName && hasCollectionSignals
}

export function parseArchidektCollectionTable(input: string): ImportedSingleRow[] {
  const lines = input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) return []

  const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(',') ? ',' : null
  if (!delimiter) return []

  const headers = splitDelimitedLine(lines[0], delimiter).map(normalizeHeader)

  const quantityIndex = headers.findIndex((header) =>
    ['quantity', 'qty', 'count', 'amount'].includes(header)
  )
  const nameIndex = headers.findIndex((header) =>
    ['card', 'name', 'cardname', 'cardtitle'].includes(header)
  )

  if (quantityIndex === -1 || nameIndex === -1) {
    return []
  }

  const rows: ImportedSingleRow[] = []

  for (const line of lines.slice(1)) {
    const values = splitDelimitedLine(line, delimiter)
    const row = Object.fromEntries(
      headers.map((header, index) => [header, values[index]?.trim() ?? ''])
    )

    const quantity = Number(row[headers[quantityIndex]])
    const cardName = row[headers[nameIndex]]?.trim()

    if (!quantity || !cardName) continue

    const setCode =
      getFirstValue(row, ['setcode', 'set', 'editioncode']).toLowerCase() || undefined
    const collectorNumber =
      getFirstValue(row, ['collectornumber', 'number', 'cn']) || undefined

    rows.push({
      sourceItemKey: [
        cardName.toLowerCase(),
        setCode ?? '',
        collectorNumber ?? '',
        getFirstValue(row, ['language', 'lang']).toLowerCase(),
        parseFoilValue(getFirstValue(row, ['foil', 'finish', 'printing', 'iscardfoil'])) ? 'foil' : 'normal',
        parseConditionValue(getFirstValue(row, ['condition'])),
      ].join('::'),
      cardName,
      quantity,
      foil: parseFoilValue(getFirstValue(row, ['foil', 'finish', 'printing', 'iscardfoil'])),
      condition: parseConditionValue(getFirstValue(row, ['condition'])),
      language: (getFirstValue(row, ['language', 'lang']) || 'en').toLowerCase(),
      setCode,
      setName: getFirstValue(row, ['setname', 'editionname', 'edition']) || undefined,
      collectorNumber,
    })
  }

  return rows
}
