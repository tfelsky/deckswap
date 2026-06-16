export type WholesaleInventoryLot = {
  id: string
  ownerId: string
  ownerName?: string | null
  title: string
  category?: string | null
  tags?: string[] | null
  quantity?: number | null
  estimatedValueUsd?: number | null
  acquiredAt?: string | Date | null
  lastMovedAt?: string | Date | null
  country?: string | null
  wholesaleEnabled?: boolean | null
  wantedCategories?: string[] | null
  blockedOwnerIds?: string[] | null
}

export type WholesaleTurnoverOptions = {
  asOf?: string | Date
  minimumAgeDays?: number
  targetBundleValueUsd?: number
  maxLotsPerSide?: number
  maxValueGapPercent?: number
  maxCashEqualizationUsd?: number
  proposalLimit?: number
}

export type WholesaleTurnoverProposal = {
  ownerAId: string
  ownerAName: string
  ownerBId: string
  ownerBName: string
  ownerALots: WholesaleInventoryLot[]
  ownerBLots: WholesaleInventoryLot[]
  ownerAValueUsd: number
  ownerBValueUsd: number
  valueGapUsd: number
  valueGapPercent: number
  cashEqualizationUsd: number
  cashPaidByOwnerId: string | null
  averageAgeDays: number
  totalLots: number
  totalUnits: number
  turnoverScore: number
  reasons: string[]
}

type EligibleLot = WholesaleInventoryLot & {
  ageDays: number
  valueUsd: number
  normalizedCountry: string | null
  tokens: string[]
}

type OwnerInventory = {
  ownerId: string
  ownerName: string
  country: string | null
  wantedTokens: string[]
  blockedOwnerIds: Set<string>
  lots: EligibleLot[]
}

type Bundle = {
  lots: EligibleLot[]
  valueUsd: number
  demandHits: number
}

const DEFAULT_MINIMUM_AGE_DAYS = 120
const DEFAULT_TARGET_BUNDLE_VALUE_USD = 1500
const DEFAULT_MAX_LOTS_PER_SIDE = 12
const DEFAULT_MAX_VALUE_GAP_PERCENT = 0.18
const DEFAULT_MAX_CASH_EQUALIZATION_USD = 300
const DEFAULT_PROPOSAL_LIMIT = 12

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function normalizeToken(value?: string | null) {
  return value?.trim().toLowerCase().replace(/\s+/g, ' ') || ''
}

function uniqueNonEmpty(values: string[]) {
  return [...new Set(values.map(normalizeToken).filter(Boolean))]
}

function parseDate(value?: string | Date | null) {
  if (!value) return null
  const parsed = value instanceof Date ? value : new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function daysBetween(start: Date, end: Date) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / millisecondsPerDay))
}

function getStaleAgeDays(lot: WholesaleInventoryLot, asOf: Date) {
  const staleSince = parseDate(lot.lastMovedAt) ?? parseDate(lot.acquiredAt)
  return staleSince ? daysBetween(staleSince, asOf) : 0
}

function getLotTokens(lot: WholesaleInventoryLot) {
  return uniqueNonEmpty([lot.category ?? '', ...(lot.tags ?? [])])
}

function getLotValue(lot: WholesaleInventoryLot) {
  return Math.max(0, Number(lot.estimatedValueUsd ?? 0))
}

function getLotQuantity(lot: WholesaleInventoryLot) {
  return Math.max(1, Math.floor(Number(lot.quantity ?? 1)))
}

function normalizeCountry(value?: string | null) {
  return normalizeToken(value) || null
}

function demandScore(lot: EligibleLot, wantedTokens: string[]) {
  if (wantedTokens.length === 0) return 4
  return lot.tokens.some((token) => wantedTokens.includes(token)) ? 18 : -8
}

function toOwnerInventory(lots: EligibleLot[]) {
  const [first] = lots

  return {
    ownerId: first.ownerId,
    ownerName: first.ownerName?.trim() || `Owner ${first.ownerId}`,
    country: first.normalizedCountry,
    wantedTokens: uniqueNonEmpty(lots.flatMap((lot) => lot.wantedCategories ?? [])),
    blockedOwnerIds: new Set(lots.flatMap((lot) => lot.blockedOwnerIds ?? [])),
    lots,
  } satisfies OwnerInventory
}

function buildBundle(
  lots: EligibleLot[],
  wantedTokens: string[],
  targetValueUsd: number,
  maxLots: number
): Bundle {
  const candidates = lots
    .map((lot) => ({
      lot,
      demand: demandScore(lot, wantedTokens),
    }))
    .filter((candidate) => candidate.demand >= 0)
    .sort((a, b) => {
      if (b.demand !== a.demand) return b.demand - a.demand
      if (b.lot.ageDays !== a.lot.ageDays) return b.lot.ageDays - a.lot.ageDays
      return b.lot.valueUsd - a.lot.valueUsd
    })

  const selected: EligibleLot[] = []
  let valueUsd = 0
  let demandHits = 0
  const softCeiling = targetValueUsd * 1.2

  for (const candidate of candidates) {
    if (selected.length >= maxLots) break

    const nextValue = valueUsd + candidate.lot.valueUsd
    if (selected.length > 0 && valueUsd >= targetValueUsd && nextValue > softCeiling) continue

    selected.push(candidate.lot)
    valueUsd = nextValue
    if (candidate.demand >= 18) demandHits += 1
  }

  return { lots: selected, valueUsd, demandHits }
}

function trimBundleToImproveBalance(
  bundle: Bundle,
  otherValueUsd: number,
  minimumLots: number,
  wantedTokens: string[]
) {
  let current = bundle
  let improved = true

  while (improved && current.lots.length > minimumLots) {
    improved = false
    const currentGap = Math.abs(current.valueUsd - otherValueUsd)

    for (let index = current.lots.length - 1; index >= 0; index -= 1) {
      const candidateLots = current.lots.filter((_, lotIndex) => lotIndex !== index)
      const candidateValue = candidateLots.reduce((sum, lot) => sum + lot.valueUsd, 0)
      const candidateGap = Math.abs(candidateValue - otherValueUsd)

      if (candidateGap < currentGap) {
        current = {
          lots: candidateLots,
          valueUsd: candidateValue,
          demandHits: candidateLots.filter((lot) => demandScore(lot, wantedTokens) >= 18).length,
        }
        improved = true
        break
      }
    }
  }

  return current
}

function groupLotsByOwner(lots: EligibleLot[]) {
  const grouped = new Map<string, EligibleLot[]>()

  for (const lot of lots) {
    const ownerLots = grouped.get(lot.ownerId) ?? []
    ownerLots.push(lot)
    grouped.set(lot.ownerId, ownerLots)
  }

  return [...grouped.values()]
}

function valueGap(ownerAValueUsd: number, ownerBValueUsd: number) {
  const gapUsd = Math.abs(ownerAValueUsd - ownerBValueUsd)
  const highValueUsd = Math.max(ownerAValueUsd, ownerBValueUsd, 1)

  return {
    gapUsd,
    gapPercent: gapUsd / highValueUsd,
  }
}

function valuesCanClear(
  ownerAValueUsd: number,
  ownerBValueUsd: number,
  maxValueGapPercent: number,
  maxCashEqualizationUsd: number
) {
  const gap = valueGap(ownerAValueUsd, ownerBValueUsd)
  return gap.gapPercent <= maxValueGapPercent || gap.gapUsd <= maxCashEqualizationUsd
}

function scoreProposal(
  ownerA: OwnerInventory,
  ownerB: OwnerInventory,
  ownerABundle: Bundle,
  ownerBBundle: Bundle,
  gapPercent: number
) {
  const allLots = [...ownerABundle.lots, ...ownerBBundle.lots]
  const averageAgeDays = Math.round(
    allLots.reduce((sum, lot) => sum + lot.ageDays, 0) / Math.max(allLots.length, 1)
  )
  const demandHitRate =
    (ownerABundle.demandHits + ownerBBundle.demandHits) / Math.max(allLots.length, 1)
  const valueBalanceScore = clamp(28 - gapPercent * 100, 0, 28)
  const ageScore = clamp(averageAgeDays / 12, 0, 24)
  const volumeScore = clamp(allLots.length * 2 + allLots.reduce((sum, lot) => sum + getLotQuantity(lot), 0) / 25, 0, 20)
  const demandScoreValue = clamp(demandHitRate * 22, 0, 22)
  const geographyScore = ownerA.country && ownerA.country === ownerB.country ? 6 : ownerA.country && ownerB.country ? 1 : 3

  return Math.round(clamp(valueBalanceScore + ageScore + volumeScore + demandScoreValue + geographyScore, 0, 100))
}

function proposalReasons(
  ownerA: OwnerInventory,
  ownerB: OwnerInventory,
  ownerABundle: Bundle,
  ownerBBundle: Bundle,
  averageAgeDays: number,
  valueGapUsd: number,
  cashEqualizationUsd: number,
  cashPaidByOwnerId: string | null
) {
  const totalLots = ownerABundle.lots.length + ownerBBundle.lots.length
  const demandHits = ownerABundle.demandHits + ownerBBundle.demandHits
  const reasons = [
    `Moves ${totalLots} aged wholesale lots in one owner-to-owner proposal.`,
    `Average inventory age is ${averageAgeDays} days.`,
  ]

  if (demandHits > 0) {
    reasons.push(`${demandHits} lots match the other owner's stated wholesale demand.`)
  } else {
    reasons.push('No narrow demand filter was set, so the match optimizes for age and value balance.')
  }

  if (valueGapUsd === 0) {
    reasons.push('Bundle values are exactly balanced.')
  } else if (cashEqualizationUsd > 0 && cashPaidByOwnerId) {
    const payerName = cashPaidByOwnerId === ownerA.ownerId ? ownerA.ownerName : ownerB.ownerName
    reasons.push(`${payerName} can equalize the trade with ${formatUsd(cashEqualizationUsd)}.`)
  } else {
    reasons.push(`Bundle values are within ${formatUsd(valueGapUsd)} of each other.`)
  }

  if (ownerA.country && ownerA.country === ownerB.country) {
    reasons.push('Same-country logistics should keep shipping friction lower.')
  }

  return reasons
}

function formatUsd(value: number) {
  return `$${Math.round(value).toLocaleString('en-US')}`
}

function toPublicLot(lot: EligibleLot): WholesaleInventoryLot {
  const { ageDays, valueUsd, normalizedCountry, tokens, ...publicLot } = lot
  return publicLot
}

export function generateWholesaleTurnoverProposals(
  lots: WholesaleInventoryLot[],
  options: WholesaleTurnoverOptions = {}
): WholesaleTurnoverProposal[] {
  const asOf = parseDate(options.asOf) ?? new Date()
  const minimumAgeDays = options.minimumAgeDays ?? DEFAULT_MINIMUM_AGE_DAYS
  const targetBundleValueUsd = options.targetBundleValueUsd ?? DEFAULT_TARGET_BUNDLE_VALUE_USD
  const maxLotsPerSide = options.maxLotsPerSide ?? DEFAULT_MAX_LOTS_PER_SIDE
  const maxValueGapPercent = options.maxValueGapPercent ?? DEFAULT_MAX_VALUE_GAP_PERCENT
  const maxCashEqualizationUsd =
    options.maxCashEqualizationUsd ?? DEFAULT_MAX_CASH_EQUALIZATION_USD
  const proposalLimit = options.proposalLimit ?? DEFAULT_PROPOSAL_LIMIT

  const eligibleLots = lots
    .map((lot) => ({
      ...lot,
      ageDays: getStaleAgeDays(lot, asOf),
      valueUsd: getLotValue(lot),
      normalizedCountry: normalizeCountry(lot.country),
      tokens: getLotTokens(lot),
    }))
    .filter(
      (lot) =>
        lot.wholesaleEnabled !== false &&
        lot.ownerId.trim().length > 0 &&
        lot.valueUsd > 0 &&
        lot.ageDays >= minimumAgeDays
    )

  const owners = groupLotsByOwner(eligibleLots)
    .filter((ownerLots) => ownerLots.length > 0)
    .map(toOwnerInventory)

  const proposals: WholesaleTurnoverProposal[] = []

  for (let aIndex = 0; aIndex < owners.length; aIndex += 1) {
    for (let bIndex = aIndex + 1; bIndex < owners.length; bIndex += 1) {
      const ownerA = owners[aIndex]
      const ownerB = owners[bIndex]

      if (ownerA.blockedOwnerIds.has(ownerB.ownerId) || ownerB.blockedOwnerIds.has(ownerA.ownerId)) {
        continue
      }

      let ownerABundle = buildBundle(
        ownerA.lots,
        ownerB.wantedTokens,
        targetBundleValueUsd,
        maxLotsPerSide
      )
      let ownerBBundle = buildBundle(
        ownerB.lots,
        ownerA.wantedTokens,
        targetBundleValueUsd,
        maxLotsPerSide
      )

      if (ownerABundle.lots.length === 0 || ownerBBundle.lots.length === 0) continue

      if (ownerABundle.valueUsd > ownerBBundle.valueUsd) {
        ownerABundle = trimBundleToImproveBalance(
          ownerABundle,
          ownerBBundle.valueUsd,
          1,
          ownerB.wantedTokens
        )
      } else if (ownerBBundle.valueUsd > ownerABundle.valueUsd) {
        ownerBBundle = trimBundleToImproveBalance(
          ownerBBundle,
          ownerABundle.valueUsd,
          1,
          ownerA.wantedTokens
        )
      }

      if (
        !valuesCanClear(
          ownerABundle.valueUsd,
          ownerBBundle.valueUsd,
          maxValueGapPercent,
          maxCashEqualizationUsd
        )
      ) {
        continue
      }

      const gap = valueGap(ownerABundle.valueUsd, ownerBBundle.valueUsd)
      const cashEqualizationUsd = gap.gapUsd > 0 ? Math.round(gap.gapUsd) : 0
      const cashPaidByOwnerId =
        cashEqualizationUsd === 0
          ? null
          : ownerABundle.valueUsd < ownerBBundle.valueUsd
            ? ownerA.ownerId
            : ownerB.ownerId
      const allLots = [...ownerABundle.lots, ...ownerBBundle.lots]
      const averageAgeDays = Math.round(
        allLots.reduce((sum, lot) => sum + lot.ageDays, 0) / Math.max(allLots.length, 1)
      )
      const totalUnits = allLots.reduce((sum, lot) => sum + getLotQuantity(lot), 0)

      proposals.push({
        ownerAId: ownerA.ownerId,
        ownerAName: ownerA.ownerName,
        ownerBId: ownerB.ownerId,
        ownerBName: ownerB.ownerName,
        ownerALots: ownerABundle.lots.map(toPublicLot),
        ownerBLots: ownerBBundle.lots.map(toPublicLot),
        ownerAValueUsd: Math.round(ownerABundle.valueUsd),
        ownerBValueUsd: Math.round(ownerBBundle.valueUsd),
        valueGapUsd: Math.round(gap.gapUsd),
        valueGapPercent: gap.gapPercent,
        cashEqualizationUsd,
        cashPaidByOwnerId,
        averageAgeDays,
        totalLots: allLots.length,
        totalUnits,
        turnoverScore: scoreProposal(ownerA, ownerB, ownerABundle, ownerBBundle, gap.gapPercent),
        reasons: proposalReasons(
          ownerA,
          ownerB,
          ownerABundle,
          ownerBBundle,
          averageAgeDays,
          Math.round(gap.gapUsd),
          cashEqualizationUsd,
          cashPaidByOwnerId
        ),
      })
    }
  }

  return proposals
    .sort((a, b) => {
      if (b.turnoverScore !== a.turnoverScore) return b.turnoverScore - a.turnoverScore
      if (b.averageAgeDays !== a.averageAgeDays) return b.averageAgeDays - a.averageAgeDays
      return b.totalLots - a.totalLots
    })
    .slice(0, proposalLimit)
}
