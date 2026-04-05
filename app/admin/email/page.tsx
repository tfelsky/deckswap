import { AdminEmailConsole } from '@/components/admin-email-console'
import { getEmailHealthReport } from '@/lib/email'
import { getMarketingAudienceSnapshot } from '@/lib/email-audience'

export const dynamic = 'force-dynamic'

export default async function AdminEmailPage() {
  const initialHealth = getEmailHealthReport()

  let initialAudience: unknown = null
  try {
    initialAudience = await getMarketingAudienceSnapshot()
  } catch (error) {
    initialAudience = {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unable to load marketing audience snapshot.',
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="max-w-4xl">
        <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-300">
          Email Ops
        </div>
        <h2 className="mt-4 text-4xl font-semibold tracking-tight">
          Resend console
        </h2>
        <p className="mt-3 text-zinc-400">
          Run email health checks, send tests, sync templates, sync your opted-in audience, and
          draft or send broadcasts without leaving the admin dashboard.
        </p>
      </div>

      <div className="mt-8">
        <AdminEmailConsole
          initialHealth={initialHealth}
          initialAudience={initialAudience}
        />
      </div>
    </section>
  )
}
