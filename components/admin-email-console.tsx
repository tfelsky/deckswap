'use client'

import { useState } from 'react'

type ActionState = {
  loading: boolean
  error: string | null
  data: unknown
}

type AdminEmailConsoleProps = {
  initialHealth: unknown
  initialAudience: unknown
}

function ResultPanel({
  title,
  state,
}: {
  title: string
  state: ActionState
}) {
  if (!state.loading && !state.error && !state.data) return null

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">{title}</div>
      {state.loading ? <p className="mt-3 text-sm text-zinc-300">Working...</p> : null}
      {state.error ? <p className="mt-3 text-sm text-red-300">{state.error}</p> : null}
      {state.data ? (
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-zinc-300">
          {JSON.stringify(state.data, null, 2)}
        </pre>
      ) : null}
    </div>
  )
}

export function AdminEmailConsole({
  initialHealth,
  initialAudience,
}: AdminEmailConsoleProps) {
  const [healthState, setHealthState] = useState<ActionState>({
    loading: false,
    error: null,
    data: initialHealth,
  })
  const [testState, setTestState] = useState<ActionState>({
    loading: false,
    error: null,
    data: null,
  })
  const [templateState, setTemplateState] = useState<ActionState>({
    loading: false,
    error: null,
    data: null,
  })
  const [audienceState, setAudienceState] = useState<ActionState>({
    loading: false,
    error: null,
    data: initialAudience,
  })
  const [broadcastState, setBroadcastState] = useState<ActionState>({
    loading: false,
    error: null,
    data: null,
  })
  const [nurtureState, setNurtureState] = useState<ActionState>({
    loading: false,
    error: null,
    data: null,
  })
  const [newsletterState, setNewsletterState] = useState<ActionState>({
    loading: false,
    error: null,
    data: null,
  })

  async function runAction(
    url: string,
    init: RequestInit,
    setter: (state: ActionState) => void
  ) {
    setter({ loading: true, error: null, data: null })

    try {
      const response = await fetch(url, init)
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setter({
          loading: false,
          error:
            (payload as { error?: string } | null)?.error ||
            `Request failed with status ${response.status}.`,
          data: payload,
        })
        return
      }

      setter({
        loading: false,
        error: null,
        data: payload,
      })
    } catch (error) {
      setter({
        loading: false,
        error: error instanceof Error ? error.message : 'Request failed.',
        data: null,
      })
    }
  }

  async function refreshHealth() {
    await runAction(
      '/api/admin/email-health',
      {
        method: 'GET',
      },
      setHealthState
    )
  }

  async function sendTestEmail(formData: FormData) {
    await runAction(
      '/api/admin/resend/test-email',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: String(formData.get('to') || ''),
          subject: String(formData.get('subject') || ''),
          message: String(formData.get('message') || ''),
        }),
      },
      setTestState
    )
  }

  async function syncTemplates() {
    await runAction(
      '/api/admin/resend/templates/sync',
      {
        method: 'POST',
      },
      setTemplateState
    )
  }

  async function syncAudience() {
    await runAction(
      '/api/admin/resend/broadcasts',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'sync_audience',
        }),
      },
      setAudienceState
    )
  }

  async function createBroadcast(formData: FormData) {
    await runAction(
      '/api/admin/resend/broadcasts',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create_broadcast',
          subject: String(formData.get('subject') || ''),
          body: String(formData.get('body') || ''),
          previewText: String(formData.get('previewText') || ''),
          ctaLabel: String(formData.get('ctaLabel') || ''),
          ctaUrl: String(formData.get('ctaUrl') || ''),
          name: String(formData.get('name') || ''),
          send: formData.get('sendNow') === 'on',
          scheduledAt: String(formData.get('scheduledAt') || ''),
        }),
      },
      setBroadcastState
    )
  }

  async function previewNurture(formData: FormData) {
    await runAction(
      '/api/admin/resend/nurture',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'preview',
          startAt: String(formData.get('startAt') || ''),
        }),
      },
      setNurtureState
    )
  }

  async function queueNurture(formData: FormData) {
    await runAction(
      '/api/admin/resend/nurture',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'queue',
          userId: String(formData.get('userId') || ''),
          email: String(formData.get('email') || ''),
          startAt: String(formData.get('startAt') || ''),
        }),
      },
      setNurtureState
    )
  }

  async function previewNewsletter(formData: FormData) {
    await runAction(
      '/api/admin/resend/newsletter',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'preview',
          upcomingSetName: String(formData.get('upcomingSetName') || ''),
          creatorFilters: String(formData.get('creatorFilters') || ''),
        }),
      },
      setNewsletterState
    )
  }

  async function createNewsletterBroadcast(formData: FormData) {
    await runAction(
      '/api/admin/resend/newsletter',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create_broadcast',
          upcomingSetName: String(formData.get('upcomingSetName') || ''),
          creatorFilters: String(formData.get('creatorFilters') || ''),
          send: formData.get('newsletterSendNow') === 'on',
          scheduledAt: String(formData.get('newsletterScheduledAt') || ''),
        }),
      },
      setNewsletterState
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">System Health</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Check config, sender setup, and audience readiness before debugging inbox issues.
              </p>
            </div>
            <button
              type="button"
              onClick={refreshHealth}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
            >
              Refresh health
            </button>
          </div>

          <ResultPanel title="Email health" state={healthState} />
        </div>

        <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
          <h2 className="text-2xl font-semibold">Send Test Email</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Fire a direct transactional email through Resend to confirm sending works end to end.
          </p>

          <form
            action={async (formData) => {
              await sendTestEmail(formData)
            }}
            className="mt-5 space-y-4"
          >
            <input
              name="to"
              placeholder="you@yourdomain.com"
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white"
            />
            <input
              name="subject"
              defaultValue="DeckSwap test email"
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white"
            />
            <textarea
              name="message"
              rows={4}
              defaultValue="This is a test email from the DeckSwap Resend integration."
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white"
            />
            <button className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90">
              Send test email
            </button>
          </form>

          <div className="mt-5">
            <ResultPanel title="Test email result" state={testState} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">Template Sync</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Push the stored transactional and marketing templates into Resend and publish them.
              </p>
            </div>
            <button
              type="button"
              onClick={syncTemplates}
              className="rounded-2xl bg-emerald-400 px-4 py-2 text-sm font-medium text-zinc-950 hover:opacity-90"
            >
              Sync templates
            </button>
          </div>

          <div className="mt-5">
            <ResultPanel title="Template sync result" state={templateState} />
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">Audience Sync</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Pull opted-in users from Supabase and sync them into the Resend marketing segment.
              </p>
            </div>
            <button
              type="button"
              onClick={syncAudience}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
            >
              Sync audience
            </button>
          </div>

          <div className="mt-5">
            <ResultPanel title="Audience result" state={audienceState} />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <h2 className="text-2xl font-semibold">Draft Or Send Broadcast</h2>
        <p className="mt-2 max-w-3xl text-sm text-zinc-400">
          Create a broadcast from the synced marketing segment. Leave send unchecked to create a
          draft in Resend first.
        </p>

        <form
          action={async (formData) => {
            await createBroadcast(formData)
          }}
          className="mt-6 grid gap-4 lg:grid-cols-2"
        >
          <input
            name="name"
            placeholder="Broadcast name"
            className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white"
          />
          <input
            name="subject"
            placeholder="Subject"
            className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white"
          />
          <input
            name="previewText"
            placeholder="Preview text"
            className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white"
          />
          <input
            name="scheduledAt"
            placeholder="Scheduled ISO time, optional"
            className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white"
          />
          <input
            name="ctaLabel"
            placeholder="CTA label"
            className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white"
          />
          <input
            name="ctaUrl"
            placeholder="CTA URL"
            className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white"
          />
          <textarea
            name="body"
            rows={8}
            placeholder="Broadcast body"
            className="lg:col-span-2 rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white"
          />

          <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" name="sendNow" />
            Send now instead of drafting
          </label>

          <div className="lg:col-span-2">
            <button className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90">
              Create broadcast
            </button>
          </div>
        </form>

        <div className="mt-5">
          <ResultPanel title="Broadcast result" state={broadcastState} />
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <h2 className="text-2xl font-semibold">10-Day Nurture Follow-up</h2>
        <p className="mt-2 max-w-3xl text-sm text-zinc-400">
          Preview or queue a 10-day follow-up sequence for a specific opted-in user. Queueing uses
          scheduled Resend emails and respects the marketing opt-in audience pulled from Supabase.
        </p>

        <form className="mt-6 grid gap-4 lg:grid-cols-2">
          <input
            name="userId"
            placeholder="Supabase user ID, optional"
            className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white"
          />
          <input
            name="email"
            placeholder="Opted-in email, optional"
            className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white"
          />
          <input
            name="startAt"
            placeholder="Sequence start ISO time, optional"
            className="lg:col-span-2 rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white"
          />
          <div className="flex flex-wrap gap-3 lg:col-span-2">
            <button
              formAction={async (formData) => {
                await previewNurture(formData)
              }}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white hover:bg-white/10"
            >
              Preview 10-day sequence
            </button>
            <button
              formAction={async (formData) => {
                await queueNurture(formData)
              }}
              className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90"
            >
              Queue nurture sequence
            </button>
          </div>
        </form>

        <div className="mt-5">
          <ResultPanel title="Nurture result" state={nurtureState} />
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <h2 className="text-2xl font-semibold">Marketplace Newsletter</h2>
        <p className="mt-2 max-w-3xl text-sm text-zinc-400">
          Generate a newsletter issue from your live marketplace data: upcoming set headlines,
          creator content, best decks for sale, latest listings, and latest sales. Preview it
          first, then create a Resend draft or send it immediately.
        </p>

        <form className="mt-6 grid gap-4 lg:grid-cols-2">
          <input
            name="upcomingSetName"
            placeholder="Upcoming set focus, optional"
            className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white"
          />
          <input
            name="creatorFilters"
            placeholder="Favorite creators or sources, comma-separated"
            className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white"
          />
          <input
            name="newsletterScheduledAt"
            placeholder="Scheduled ISO time, optional"
            className="lg:col-span-2 rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white"
          />
          <label className="inline-flex items-center gap-2 text-sm text-zinc-300 lg:col-span-2">
            <input type="checkbox" name="newsletterSendNow" />
            Send now instead of drafting
          </label>
          <div className="flex flex-wrap gap-3 lg:col-span-2">
            <button
              formAction={async (formData) => {
                await previewNewsletter(formData)
              }}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white hover:bg-white/10"
            >
              Preview newsletter issue
            </button>
            <button
              formAction={async (formData) => {
                await createNewsletterBroadcast(formData)
              }}
              className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 hover:opacity-90"
            >
              Create newsletter broadcast
            </button>
          </div>
        </form>

        <div className="mt-5">
          <ResultPanel title="Newsletter result" state={newsletterState} />
        </div>
      </div>
    </div>
  )
}
