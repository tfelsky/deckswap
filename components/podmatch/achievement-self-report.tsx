import { reportAchievementGoalAction } from '@/app/podmatch/leagues/actions'
import type { PlayerAchievementGoal } from '@/lib/podmatch/achievement-goals'

export default function AchievementSelfReport({
  leagueId,
  gameId,
  playerId,
  goals,
  canReport,
  compact = false,
}: {
  leagueId: string
  gameId: string
  playerId: string
  goals: PlayerAchievementGoal[]
  canReport: boolean
  compact?: boolean
}) {
  if (goals.length === 0) return null

  const completedGoals = goals.filter((goal) => goal.completed)

  if (!canReport) {
    if (completedGoals.length === 0) return null
    return (
      <p className="mt-1 text-xs text-zinc-500">
        Goals: {completedGoals.map((goal) => goal.title).join(', ')}
      </p>
    )
  }

  return (
    <div className={compact ? 'mt-3 space-y-2' : 'mt-2 space-y-2'}>
      <p className="text-xs font-medium text-zinc-400">Your achievement goals</p>
      <div className="grid gap-2">
        {goals.map((goal) => (
          <div
            key={goal.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2"
          >
            <div className="min-w-0 text-xs">
              <p className="font-medium text-zinc-100">{goal.title}</p>
              {!compact ? <p className="mt-0.5 text-zinc-500">{goal.prompt}</p> : null}
            </div>
            <form action={reportAchievementGoalAction} className="shrink-0">
              <input type="hidden" name="leagueId" value={leagueId} />
              <input type="hidden" name="gameId" value={gameId} />
              <input type="hidden" name="playerId" value={playerId} />
              <input type="hidden" name="goalId" value={goal.id} />
              <input type="hidden" name="completed" value={goal.completed ? 'false' : 'true'} />
              <button
                className={`rounded-lg border px-2 py-1 text-xs font-medium transition ${
                  goal.completed
                    ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
                    : 'border-white/10 bg-zinc-950 text-zinc-300 hover:bg-white/10'
                }`}
              >
                {goal.completed ? 'Reported' : 'I hit this'}
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  )
}
