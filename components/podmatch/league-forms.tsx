'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import FormActionButton from '@/components/form-action-button'
import {
  addPlayerAction,
  createLeagueAction,
  generatePodsAction,
  registerDeckAction,
  type ActionState,
} from '@/app/podmatch/leagues/actions'

const inputClass =
  'w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-primary/50 focus:outline-none'

function ErrorLine({ state }: { state: ActionState }) {
  if (!state.error) return null
  return <p className="text-sm text-red-400">{state.error}</p>
}

export function CreateLeagueForm() {
  const [state, action] = useActionState<ActionState, FormData>(createLeagueAction, {})
  return (
    <form action={action} className="space-y-3">
      <input name="name" placeholder="League name" className={inputClass} required />
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm text-zinc-400">
          Pod size
          <select name="pod_size" defaultValue="4" className={`mt-1 ${inputClass}`}>
            <option value="4">4</option>
            <option value="3">3</option>
          </select>
        </label>
        <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-zinc-300">
          <input type="checkbox" name="proxies_allowed" defaultChecked className="h-4 w-4 accent-primary" />
          Proxies allowed
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm text-zinc-400">
          Season start
          <input type="date" name="season_start" className={`mt-1 ${inputClass}`} />
        </label>
        <label className="text-sm text-zinc-400">
          Season end
          <input type="date" name="season_end" className={`mt-1 ${inputClass}`} />
        </label>
      </div>
      <ErrorLine state={state} />
      <FormActionButton
        pendingLabel="Creating…"
        className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
      >
        Create league
      </FormActionButton>
    </form>
  )
}

export function AddPlayerForm({ leagueId }: { leagueId: string }) {
  const [state, action] = useActionState<ActionState, FormData>(addPlayerAction, {})
  const formRef = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (state.ok) formRef.current?.reset()
  }, [state.ok])
  return (
    <form ref={formRef} action={action} className="flex flex-wrap items-start gap-2">
      <input type="hidden" name="leagueId" value={leagueId} />
      <input name="display_name" placeholder="Player name" className={`max-w-xs ${inputClass}`} required />
      <FormActionButton
        pendingLabel="Adding…"
        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium hover:bg-white/10"
      >
        Add player
      </FormActionButton>
      <div className="basis-full">
        <ErrorLine state={state} />
      </div>
    </form>
  )
}

export function RegisterDeckForm({
  leagueId,
  players,
  decks,
}: {
  leagueId: string
  players: { id: string; display_name: string }[]
  decks: { id: number; name: string; power: number | null }[]
}) {
  const [state, action] = useActionState<ActionState, FormData>(registerDeckAction, {})
  if (players.length === 0) {
    return <p className="text-sm text-zinc-500">Add a player first to register decks.</p>
  }
  return (
    <form action={action} className="flex flex-wrap items-start gap-2">
      <input type="hidden" name="leagueId" value={leagueId} />
      <select name="playerId" className={`max-w-[12rem] ${inputClass}`} required>
        <option value="">Player…</option>
        {players.map((p) => (
          <option key={p.id} value={p.id}>
            {p.display_name}
          </option>
        ))}
      </select>
      <select name="deckId" className={`max-w-[16rem] ${inputClass}`} required>
        <option value="">Deck…</option>
        {decks.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
            {d.power != null ? ` (power ${d.power})` : ' — not scored'}
          </option>
        ))}
      </select>
      <FormActionButton
        pendingLabel="Registering…"
        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium hover:bg-white/10"
      >
        Register deck
      </FormActionButton>
      <div className="basis-full">
        <ErrorLine state={state} />
      </div>
    </form>
  )
}

export function GeneratePodsButton({ leagueId }: { leagueId: string }) {
  const router = useRouter()
  const [state, action] = useActionState<ActionState, FormData>(generatePodsAction, {})
  useEffect(() => {
    if (state.ok) router.refresh()
  }, [state.ok, router])
  return (
    <form action={action} className="inline-flex flex-col gap-2">
      <input type="hidden" name="leagueId" value={leagueId} />
      <FormActionButton
        pendingLabel="Generating…"
        className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
      >
        Generate next round
      </FormActionButton>
      <ErrorLine state={state} />
    </form>
  )
}
