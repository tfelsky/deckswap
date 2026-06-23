'use client'

import { useActionState } from 'react'
import FormActionButton from '@/components/form-action-button'
import { reportGameAction, type ActionState } from '@/app/podmatch/leagues/actions'
import { selectCommanderAchievementGoals } from '@/lib/podmatch/achievement-goals'

export type ReportSeat = {
  player_id: string
  player_name: string
  deck_id: number | null
  deck_name: string
}

const inputClass =
  'w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none'

export default function ReportGameForm({
  leagueId,
  podId,
  roundNumber,
  seats,
  achievementSeed,
}: {
  leagueId: string
  podId: string | null
  roundNumber: number
  seats: ReportSeat[]
  achievementSeed: string
}) {
  const [state, action] = useActionState<ActionState, FormData>(reportGameAction, {})

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="leagueId" value={leagueId} />
      {podId ? <input type="hidden" name="podId" value={podId} /> : null}
      <input type="hidden" name="roundNumber" value={roundNumber} />
      <input type="hidden" name="playerIds" value={seats.map((s) => s.player_id).join(',')} />
      <input type="hidden" name="achievementSeed" value={achievementSeed} />

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-zinc-400">
            <tr>
              <th className="p-3">Player</th>
              <th className="p-3">Placement</th>
              <th className="p-3">Elims</th>
              <th className="p-3">Combo win</th>
              <th className="p-3">Sportsmanship</th>
              <th className="p-3">No-show</th>
            </tr>
          </thead>
          <tbody>
            {seats.map((seat) => (
              <tr key={seat.player_id} className="border-t border-white/5">
                <td className="p-3">
                  <div className="font-medium text-white">{seat.player_name}</div>
                  <div className="text-xs text-zinc-500">{seat.deck_name}</div>
                  {seat.deck_id ? (
                    <input type="hidden" name={`deck_${seat.player_id}`} value={seat.deck_id} />
                  ) : null}
                </td>
                <td className="p-3">
                  <select name={`placement_${seat.player_id}`} defaultValue="" className={`w-20 ${inputClass}`}>
                    <option value="">—</option>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-3">
                  <input
                    type="number"
                    min={0}
                    name={`elim_${seat.player_id}`}
                    defaultValue={0}
                    className={`w-16 ${inputClass}`}
                  />
                </td>
                <td className="p-3">
                  <input type="checkbox" name={`combo_${seat.player_id}`} className="h-4 w-4 accent-primary" />
                </td>
                <td className="p-3">
                  <input type="checkbox" name={`sport_${seat.player_id}`} className="h-4 w-4 accent-primary" />
                </td>
                <td className="p-3">
                  <input type="checkbox" name={`noshow_${seat.player_id}`} className="h-4 w-4 accent-primary" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-zinc-900 p-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">Commander achievement goals</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Each player gets five random goals for this game. Completed goals score 1 point each,
            up to 5 total.
          </p>
        </div>
        <div className="grid gap-3">
          {seats.map((seat) => {
            const goals = selectCommanderAchievementGoals(achievementSeed, seat.player_id)
            return (
              <fieldset key={seat.player_id} className="rounded-xl border border-white/10 bg-zinc-950 p-3">
                <legend className="px-1 text-sm font-medium text-white">{seat.player_name}</legend>
                <div className="mt-2 grid gap-2">
                  {goals.map((goal) => (
                    <label key={goal.id} className="flex gap-2 text-sm text-zinc-300">
                      <input
                        type="checkbox"
                        name={`achievement_${seat.player_id}`}
                        value={goal.id}
                        className="mt-1 h-4 w-4 shrink-0 accent-primary"
                      />
                      <span>
                        <span className="font-medium text-zinc-100">{goal.title}:</span>{' '}
                        <span className="text-zinc-400">{goal.prompt}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-zinc-400">
          Turn count (optional)
          <input type="number" min={1} name="turn_count" className={`mt-1 ${inputClass}`} />
        </label>
        <label className="text-sm text-zinc-400">
          Notes (optional)
          <input name="notes" className={`mt-1 ${inputClass}`} />
        </label>
      </div>

      {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}

      <FormActionButton
        pendingLabel="Saving…"
        className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
      >
        Submit result
      </FormActionButton>
    </form>
  )
}
