export type AchievementGoal = {
  id: string
  title: string
  prompt: string
}

export type PlayerAchievementGoal = AchievementGoal & {
  completed: boolean
}

export const ACHIEVEMENT_GOALS_PER_PLAYER = 5
export const MAX_ACHIEVEMENT_COMPLETIONS_PER_GAME = 5

export const COMMANDER_ACHIEVEMENT_GOALS: AchievementGoal[] = [
  {
    id: 'tick-tock',
    title: 'Tick Tock',
    prompt: 'Control a Watch or Clock, use time counters, or use time travel.',
  },
  {
    id: 'political-favor',
    title: 'Political Favor',
    prompt: 'Give another player a meaningful resource, protection, or deal they accept.',
  },
  {
    id: 'from-the-yard',
    title: 'From the Yard',
    prompt: 'Cast or return a nonland card from your graveyard.',
  },
  {
    id: 'commander-tax',
    title: 'Tax Season',
    prompt: 'Cast your commander after paying commander tax at least once.',
  },
  {
    id: 'full-spectrum',
    title: 'Full Spectrum',
    prompt: 'Spend three or more different colors of mana in one turn.',
  },
  {
    id: 'single-combat',
    title: 'Single Combat',
    prompt: 'Deal combat damage to exactly one opponent with exactly one creature.',
  },
  {
    id: 'table-shields',
    title: 'Table Shields',
    prompt: 'Prevent, redirect, counter, or phase out something that would hurt another player.',
  },
  {
    id: 'treasure-hunter',
    title: 'Treasure Hunter',
    prompt: 'Create or sacrifice three or more Treasure tokens in one game.',
  },
  {
    id: 'wide-board',
    title: 'Go Wide',
    prompt: 'Control ten or more creatures or creature tokens at the same time.',
  },
  {
    id: 'big-swing',
    title: 'Big Swing',
    prompt: 'Attack with one creature with power 10 or greater.',
  },
  {
    id: 'draw-engine',
    title: 'Draw Engine',
    prompt: 'Draw three or more cards from non-draw-step effects in one turn.',
  },
  {
    id: 'life-swing',
    title: 'Life Swing',
    prompt: 'Gain or drain five or more life in one turn.',
  },
  {
    id: 'stack-master',
    title: 'Stack Master',
    prompt: 'Put three or more spells or abilities you control on the stack in one turn.',
  },
  {
    id: 'landfall-party',
    title: 'Landfall Party',
    prompt: 'Have three or more lands enter under your control in one turn.',
  },
  {
    id: 'second-main',
    title: 'Second Main Hero',
    prompt: 'Cast a spell in your second main phase after attacking.',
  },
  {
    id: 'artifact-synergy',
    title: 'Metalwork',
    prompt: 'Control five or more artifacts at the same time.',
  },
  {
    id: 'enchanting-board',
    title: 'Enchanting Board',
    prompt: 'Control three or more enchantments at the same time.',
  },
  {
    id: 'planeswalker-ally',
    title: 'Loyalty Test',
    prompt: 'Activate two or more planeswalker loyalty abilities in one game.',
  },
  {
    id: 'commander-connect',
    title: 'Commander Connect',
    prompt: 'Deal combat damage to an opponent with your commander.',
  },
  {
    id: 'save-yourself',
    title: 'Not Today',
    prompt: 'Survive a turn cycle after dropping to five or less life.',
  },
  {
    id: 'odd-couple',
    title: 'Odd Couple',
    prompt: 'Control two permanents with different card types that share a creature type.',
  },
  {
    id: 'mana-bloom',
    title: 'Mana Bloom',
    prompt: 'Produce eight or more mana in one turn.',
  },
  {
    id: 'clean-answer',
    title: 'Clean Answer',
    prompt: 'Remove a permanent that was clearly threatening the table.',
  },
  {
    id: 'topdeck-moment',
    title: 'Topdeck Moment',
    prompt: 'Cast a card the same turn you drew it and have it change the game state.',
  },
  {
    id: 'monarch-matters',
    title: 'Court Intrigue',
    prompt: 'Become the monarch, take the initiative, or claim a similar table marker.',
  },
]

export function commanderAchievementSeed(
  leagueId: string,
  podId: string | null | undefined,
  roundNumber: number
): string {
  return `${leagueId}:${podId ?? 'adhoc'}:${roundNumber}:commander-achievements`
}

function hashString(input: string): number {
  let hash = 2166136261
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function seededRandom(seed: string): () => number {
  let state = hashString(seed) || 1
  return () => {
    state += 0x6d2b79f5
    let next = state
    next = Math.imul(next ^ (next >>> 15), next | 1)
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61)
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296
  }
}

export function selectCommanderAchievementGoals(
  seed: string,
  playerId: string,
  count = ACHIEVEMENT_GOALS_PER_PLAYER
): AchievementGoal[] {
  const random = seededRandom(`${seed}:${playerId}`)
  const goals = [...COMMANDER_ACHIEVEMENT_GOALS]

  for (let index = goals.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = goals[index]
    goals[index] = goals[swapIndex]
    goals[swapIndex] = current
  }

  return goals.slice(0, Math.min(count, goals.length))
}

export function buildCommanderAchievementResults(
  seed: string,
  playerId: string,
  completedGoalIds: string[]
): PlayerAchievementGoal[] {
  const selected = selectCommanderAchievementGoals(seed, playerId)
  const completed = new Set(completedGoalIds.slice(0, MAX_ACHIEVEMENT_COMPLETIONS_PER_GAME))
  return selected.map((goal) => ({ ...goal, completed: completed.has(goal.id) }))
}

export function countCompletedAchievementGoals(
  goals: PlayerAchievementGoal[] | null | undefined
): number {
  if (!Array.isArray(goals)) return 0
  return Math.min(
    goals.filter((goal) => goal.completed).length,
    MAX_ACHIEVEMENT_COMPLETIONS_PER_GAME
  )
}
