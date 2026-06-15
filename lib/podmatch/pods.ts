// PodMatch casual pod generator (spec Feature E).
//
// Given a set of already-scored decks, partition them into balanced pods of
// 3-4 and explain the fit. Everything here is deterministic: the same decks +
// options always produce the same pods, so results are shareable and printable.

export type PodDeck = {
  id: number
  name: string
  commander: string | null
  owner: string | null
  proxy_count: number | null
  overall_power: number
  speed: number
  salt: number
  combo_density: number
  tutor_density: number
  budget_pressure: number
  color_identity: string[]
}

export type PodOptions = {
  allowProxies: boolean
  allowStax: boolean
  allowCombo: boolean
  /**
   * Deck-id pairs (key `${min}:${max}`) that recently shared a table. When
   * provided, the generator tries to break up rematches without disturbing the
   * power balance. Omitted in casual mode, so default behavior is unchanged.
   */
  recentPairs?: Set<string>
}

export function pairKey(a: number, b: number): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`
}

export const DEFAULT_POD_OPTIONS: PodOptions = {
  allowProxies: true,
  allowStax: true,
  allowCombo: true,
}

export type PodFitBreakdown = {
  power_fit: number
  speed_fit: number
  salt_fit: number
  combo_fit: number
  budget_fit: number
  archetype_diversity: number
  player_preference_fit: number
}

export type GeneratedPod = {
  pod_id: string
  table_number: number
  deck_ids: number[]
  decks: PodDeck[]
  fit_score: number
  average_power: number
  fit_breakdown: PodFitBreakdown
  warnings: string[]
}

export type PodGenerationResult = {
  pods: GeneratedPod[]
  benched: PodDeck[]
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value))
}

function round(value: number): number {
  return Math.round(value)
}

function spread(values: number[]): number {
  if (values.length === 0) return 0
  return Math.max(...values) - Math.min(...values)
}

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/**
 * Decompose n decks into pod sizes drawn from {3, 4}, preferring 4-player
 * pods. Every n >= 3 is expressible except n = 5, which becomes a single
 * 5-player table (flagged as oversized by the caller).
 */
export function podSizes(n: number): number[] {
  if (n < 3) return []
  if (n === 5) return [5]
  for (let fours = Math.floor(n / 4); fours >= 0; fours--) {
    const remainder = n - fours * 4
    if (remainder % 3 === 0) {
      const threes = remainder / 3
      return [
        ...Array.from({ length: fours }, () => 4),
        ...Array.from({ length: threes }, () => 3),
      ].sort((a, b) => b - a)
    }
  }
  return [n]
}

function colorKey(deck: PodDeck): string {
  return [...deck.color_identity].sort().join('') || 'C'
}

function computeFit(decks: PodDeck[]): { breakdown: PodFitBreakdown; score: number } {
  const powers = decks.map((d) => d.overall_power)
  const speeds = decks.map((d) => d.speed)
  const salts = decks.map((d) => d.salt)
  const combos = decks.map((d) => d.combo_density)
  const budgets = decks.map((d) => d.budget_pressure)

  const power_fit = clamp(100 - spread(powers) * 22)
  const speed_fit = clamp(100 - spread(speeds) * 14)
  const salt_fit = clamp(100 - spread(salts) * 12 - Math.max(0, Math.max(...salts) - 5) * 8)
  const combo_fit = clamp(100 - spread(combos) * 12)
  const budget_fit = clamp(100 - spread(budgets) * 12)

  const distinctColors = new Set(decks.map(colorKey)).size
  const archetype_diversity = clamp((distinctColors / decks.length) * 100)

  // No player preference model in casual MVP — neutral.
  const player_preference_fit = 100

  const breakdown: PodFitBreakdown = {
    power_fit: round(power_fit),
    speed_fit: round(speed_fit),
    salt_fit: round(salt_fit),
    combo_fit: round(combo_fit),
    budget_fit: round(budget_fit),
    archetype_diversity: round(archetype_diversity),
    player_preference_fit,
  }

  const score =
    0.3 * power_fit +
    0.2 * speed_fit +
    0.15 * salt_fit +
    0.1 * combo_fit +
    0.1 * budget_fit +
    0.1 * archetype_diversity +
    0.05 * player_preference_fit

  return { breakdown, score: round(score) }
}

function podWarnings(decks: PodDeck[], options: PodOptions): string[] {
  const warnings: string[] = []

  if (decks.length > 4) {
    warnings.push(
      `${decks.length}-player table — the recommended pod size is 3 or 4. Split if you can.`
    )
  }

  const powers = decks.map((d) => d.overall_power)
  const powerSpread = spread(powers)
  if (powerSpread >= 2) {
    const strongest = decks.reduce((a, b) => (a.overall_power >= b.overall_power ? a : b))
    const weakest = decks.reduce((a, b) => (a.overall_power <= b.overall_power ? a : b))
    warnings.push(
      `Power gap of ${powerSpread.toFixed(1)} between ${strongest.name} (${strongest.overall_power}) and ${weakest.name} (${weakest.overall_power}).`
    )
  }

  if (Math.max(...powers) >= 8 && Math.min(...powers) <= 4) {
    warnings.push(
      'Mixes a cEDH-level deck with a precon-level deck — consider splitting tables.'
    )
  }

  const avgTutors = mean(decks.map((d) => d.tutor_density))
  for (const deck of decks) {
    if (deck.tutor_density >= avgTutors + 2 && deck.tutor_density >= 5) {
      warnings.push(`${deck.name} has higher tutor density than the table average.`)
    }
  }

  const comboDecks = decks.filter((d) => d.combo_density >= 5)
  if (comboDecks.length >= 2) {
    warnings.push(
      `${comboDecks.length} decks include compact infinite combos (${comboDecks
        .map((d) => d.name)
        .join(', ')}).`
    )
  }

  for (const deck of decks) {
    if (deck.salt >= 6) {
      warnings.push(`${deck.name} has high salt (${deck.salt}/10) — disclose before playing.`)
    }
  }

  // Hard-rule / option violations.
  if (!options.allowProxies) {
    for (const deck of decks) {
      if ((deck.proxy_count ?? 0) > 0) {
        warnings.push(`${deck.name} uses proxies, but proxies are disabled for this pod.`)
      }
    }
  }

  if (!options.allowStax) {
    for (const deck of decks) {
      if (deck.salt >= 6) {
        warnings.push(`${deck.name} brings stax / heavy salt, but stax is disabled for this pod.`)
      }
    }
  }

  if (!options.allowCombo) {
    for (const deck of decks) {
      if (deck.combo_density >= 5) {
        warnings.push(`${deck.name} runs fast combo, but combos are disabled for this pod.`)
      }
    }
  }

  // De-duplicate while preserving order.
  return Array.from(new Set(warnings))
}

function repeatsInGroup(group: PodDeck[], recent: Set<string>): number {
  let count = 0
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      if (recent.has(pairKey(group[i].id, group[j].id))) count++
    }
  }
  return count
}

/**
 * Local-search swap pass: trade members between equal-size pods when it
 * reduces repeat pairings without meaningfully widening the power spread.
 * Deterministic — iterates in fixed order and takes the first improving swap.
 */
function reduceRepeats(groups: PodDeck[][], recent: Set<string>): void {
  const POWER_TOLERANCE = 1
  let improved = true
  let guard = 0
  while (improved && guard++ < 100) {
    improved = false
    for (let gi = 0; gi < groups.length && !improved; gi++) {
      for (let gj = gi + 1; gj < groups.length && !improved; gj++) {
        const A = groups[gi]
        const B = groups[gj]
        if (A.length !== B.length) continue
        const beforeRepeats = repeatsInGroup(A, recent) + repeatsInGroup(B, recent)
        const beforeSpread =
          spread(A.map((d) => d.overall_power)) + spread(B.map((d) => d.overall_power))
        for (let ai = 0; ai < A.length && !improved; ai++) {
          for (let bj = 0; bj < B.length && !improved; bj++) {
            const tmp = A[ai]
            A[ai] = B[bj]
            B[bj] = tmp
            const afterRepeats = repeatsInGroup(A, recent) + repeatsInGroup(B, recent)
            const afterSpread =
              spread(A.map((d) => d.overall_power)) + spread(B.map((d) => d.overall_power))
            if (afterRepeats < beforeRepeats && afterSpread <= beforeSpread + POWER_TOLERANCE) {
              improved = true
            } else {
              // revert
              const t2 = A[ai]
              A[ai] = B[bj]
              B[bj] = t2
            }
          }
        }
      }
    }
  }
}

/**
 * Sort decks by power (descending, stable on id) and chunk consecutively so
 * each pod groups decks of similar power — the core of a "fair" table. When
 * recentPairs is supplied, a swap pass breaks up rematches afterward.
 */
export function generatePods(
  inputDecks: PodDeck[],
  options: PodOptions = DEFAULT_POD_OPTIONS
): PodGenerationResult {
  const decks = [...inputDecks].sort(
    (a, b) => b.overall_power - a.overall_power || a.id - b.id
  )

  if (decks.length < 3) {
    return { pods: [], benched: decks }
  }

  const sizes = podSizes(decks.length)
  const groups: PodDeck[][] = []
  let cursor = 0
  for (const size of sizes) {
    groups.push(decks.slice(cursor, cursor + size))
    cursor += size
  }
  const benched = decks.slice(cursor)

  if (options.recentPairs && options.recentPairs.size > 0) {
    reduceRepeats(groups, options.recentPairs)
  }

  const pods: GeneratedPod[] = groups.map((podDecks, index) => {
    const { breakdown, score } = computeFit(podDecks)
    return {
      pod_id: `table-${index + 1}`,
      table_number: index + 1,
      deck_ids: podDecks.map((d) => d.id),
      decks: podDecks,
      fit_score: score,
      average_power: Math.round(mean(podDecks.map((d) => d.overall_power)) * 10) / 10,
      fit_breakdown: breakdown,
      warnings: podWarnings(podDecks, options),
    }
  })

  return { pods, benched }
}
