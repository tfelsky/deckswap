'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import FormActionButton from '@/components/form-action-button'
import {
  createEventAction,
  joinEventAction,
  reportResultAction,
  setMyNameAction,
  startRoundAction,
  type ActionState,
} from '@/app/podmatch/play/actions'

const inputClass =
  'w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-base text-white placeholder:text-zinc-500 focus:border-primary/50 focus:outline-none'

function ErrorLine({ state }: { state: ActionState }) {
  if (!state.error) return null
  return <p className="text-sm text-red-400">{state.error}</p>
}

export function JoinEventForm({ defaultCode }: { defaultCode?: string }) {
  const [state, action] = useActionState<ActionState, FormData>(joinEventAction, {})
  return (
    <form action={action} className="space-y-3">
      <input
        name="code"
        defaultValue={defaultCode}
        inputMode="text"
        autoCapitalize="characters"
        placeholder="Event code"
        className={`${inputClass} text-center text-lg font-semibold tracking-widest`}
        required
      />
      <FormActionButton
        pendingLabel="Joining…"
        className="w-full rounded-2xl bg-primary px-5 py-3 text-base font-semibold text-primary-foreground transition hover:opacity-90"
      >
        Join event
      </FormActionButton>
      <ErrorLine state={state} />
    </form>
  )
}

export function CreateEventForm() {
  const [state, action] = useActionState<ActionState, FormData>(createEventAction, {})
  const [startLocal, setStartLocal] = useState('')
  const [durationHours, setDurationHours] = useState('4')

  const timeZone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Toronto',
    []
  )
  const eventStartAt = useMemo(() => {
    if (!startLocal) return ''
    const date = new Date(startLocal)
    return Number.isNaN(date.getTime()) ? '' : date.toISOString()
  }, [startLocal])
  const eventEndAt = useMemo(() => {
    if (!eventStartAt) return ''
    const hours = Number(durationHours) || 4
    return new Date(new Date(eventStartAt).getTime() + hours * 60 * 60 * 1000).toISOString()
  }, [durationHours, eventStartAt])

  return (
    <form action={action} className="space-y-3">
      <input name="name" placeholder="Event name (e.g. Friday Commander)" className={inputClass} required />
      <input type="hidden" name="event_start_at" value={eventStartAt} />
      <input type="hidden" name="event_end_at" value={eventEndAt} />
      <input type="hidden" name="time_zone" value={timeZone} />
      <label className="space-y-1 text-sm text-zinc-400">
        Date and start time
        <input
          type="datetime-local"
          value={startLocal}
          onChange={(event) => setStartLocal(event.target.value)}
          className={inputClass}
          required
        />
      </label>
      <label className="flex items-center justify-between gap-3 text-sm text-zinc-400">
        Duration
        <select
          value={durationHours}
          onChange={(event) => setDurationHours(event.target.value)}
          className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none"
        >
          <option value="2">2 hours</option>
          <option value="3">3 hours</option>
          <option value="4">4 hours</option>
          <option value="5">5 hours</option>
          <option value="6">6 hours</option>
        </select>
      </label>
      <label className="flex items-center justify-between gap-3 text-sm text-zinc-400">
        Table size
        <select name="pod_size" defaultValue="4" className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none">
          <option value="4">4 players</option>
          <option value="3">3 players</option>
        </select>
      </label>
      <input name="store_name" placeholder="Store name" className={inputClass} />
      <input name="location" placeholder="Store address or room" className={inputClass} />
      <input
        name="inventory_url"
        type="url"
        placeholder="Store inventory URL for deck updates"
        className={inputClass}
      />
      <p className="text-xs text-zinc-500">
        Players get a calendar invite when they join, plus friendly reminders 1 week, 1 day,
        and 1 hour before the event.
      </p>
      <FormActionButton
        pendingLabel="Creating…"
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-base font-semibold text-white transition hover:bg-white/10"
      >
        Host an event
      </FormActionButton>
      <ErrorLine state={state} />
    </form>
  )
}

export function SetNameForm({
  leagueId,
  defaultName,
}: {
  leagueId: string
  defaultName: string
}) {
  const [state, action] = useActionState<ActionState, FormData>(setMyNameAction, {})
  return (
    <form action={action} className="flex items-start gap-2">
      <input type="hidden" name="leagueId" value={leagueId} />
      <input
        name="display_name"
        defaultValue={defaultName}
        placeholder="Your name"
        className={inputClass}
        required
      />
      <FormActionButton
        pendingLabel="Saving…"
        className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium hover:bg-white/10"
      >
        {state.ok ? 'Saved' : 'Save'}
      </FormActionButton>
    </form>
  )
}

export function StartRoundButton({
  leagueId,
  label,
}: {
  leagueId: string
  label: string
}) {
  const router = useRouter()
  const [state, action] = useActionState<ActionState, FormData>(startRoundAction, {})
  useEffect(() => {
    if (state.ok) router.refresh()
  }, [state.ok, router])
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="leagueId" value={leagueId} />
      <FormActionButton
        pendingLabel="Pairing…"
        className="w-full rounded-2xl bg-primary px-5 py-3 text-base font-semibold text-primary-foreground transition hover:opacity-90"
      >
        {label}
      </FormActionButton>
      <ErrorLine state={state} />
    </form>
  )
}

export function ReportResultForm({
  leagueId,
  podId,
  roundNumber,
  seats,
  achievementSeed,
}: {
  leagueId: string
  podId: string
  roundNumber: number
  seats: { id: string; name: string }[]
  achievementSeed: string
}) {
  const [state, action, isPending] = useActionState<ActionState, FormData>(
    reportResultAction,
    {}
  )
  const seatIds = seats.map((s) => s.id).join(',')
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="leagueId" value={leagueId} />
      <input type="hidden" name="podId" value={podId} />
      <input type="hidden" name="roundNumber" value={roundNumber} />
      <input type="hidden" name="seatIds" value={seatIds} />
      <input type="hidden" name="achievementSeed" value={achievementSeed} />
      <p className="text-sm font-medium text-zinc-300">Who won this table?</p>
      <div className="grid gap-2">
        {seats.map((seat) => (
          <button
            key={seat.id}
            type="submit"
            name="winnerId"
            value={seat.id}
            disabled={isPending}
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-left text-base font-medium text-white transition hover:border-primary/40 hover:bg-primary/10 disabled:opacity-50"
          >
            {seat.name}
            <span className="text-xs text-zinc-500">Tap to record win</span>
          </button>
        ))}
      </div>
      <ErrorLine state={state} />
    </form>
  )
}
