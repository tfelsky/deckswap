import AppHeader from '@/components/app-header'
import { createClient } from '@/lib/supabase/server'
import {
  formatNotificationTimestamp,
  getNotificationPresentation,
  getUnreadNotificationsCount,
  isNotificationsSchemaMissing,
  type NotificationRow,
} from '@/lib/notifications'
import { isUnreadTradeOffer, type TradeOfferRow } from '@/lib/trade-offers'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

const GROUP_STYLES = {
  escrow: {
    card: 'border-sky-400/20 bg-sky-400/10',
    pill: 'border-sky-400/20 bg-sky-400/10 text-sky-100',
    count: 'text-sky-200',
  },
  offers: {
    card: 'border-emerald-400/20 bg-emerald-400/10',
    pill: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100',
    count: 'text-emerald-200',
  },
  comments: {
    card: 'border-amber-400/20 bg-amber-400/10',
    pill: 'border-amber-400/20 bg-amber-400/10 text-amber-100',
    count: 'text-amber-100',
  },
  system: {
    card: 'border-white/10 bg-white/5',
    pill: 'border-white/10 bg-white/5 text-zinc-300',
    count: 'text-zinc-100',
  },
} as const

export default async function NotificationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const [notificationsResult, tradeOffersResult] = await Promise.all([
    supabase
      .from('notifications')
      .select('id, user_id, actor_user_id, type, title, body, href, metadata, read_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('trade_offers')
      .select('id, offered_by_user_id, requested_user_id, offered_deck_id, requested_deck_id, cash_equalization_usd, status, message, accepted_trade_transaction_id, last_action_by_user_id, offered_by_viewed_at, requested_user_viewed_at, created_at, updated_at')
      .or(`offered_by_user_id.eq.${user.id},requested_user_id.eq.${user.id}`),
  ])

  async function markAllReadAction() {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/sign-in')
    }

    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null)

    redirect('/notifications')
  }

  async function markReadAction(formData: FormData) {
    'use server'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/sign-in')
    }

    const notificationId = Number(formData.get('notification_id'))
    if (!Number.isFinite(notificationId)) {
      redirect('/notifications')
    }

    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', user.id)

    redirect('/notifications')
  }

  const unreadNotifications = await getUnreadNotificationsCount(supabase, user.id)
  const unreadTradeOffers = ((tradeOffersResult.data ?? []) as TradeOfferRow[]).filter((offer) =>
    isUnreadTradeOffer(offer, user.id)
  ).length

  if (notificationsResult.error) {
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-white">
        <div className="mx-auto max-w-4xl rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
          <h1 className="text-2xl font-semibold text-red-300">Notifications unavailable</h1>
          <p className="mt-3 text-sm text-zinc-300">
            {isNotificationsSchemaMissing(notificationsResult.error.message)
              ? 'Run docs/sql/notifications.sql in Supabase to enable notifications.'
              : notificationsResult.error.message}
          </p>
        </div>
      </main>
    )
  }

  const notifications = (notificationsResult.data ?? []) as NotificationRow[]
  const notificationsByGroup = {
    escrow: [] as NotificationRow[],
    offers: [] as NotificationRow[],
    comments: [] as NotificationRow[],
    system: [] as NotificationRow[],
  }

  for (const notification of notifications) {
    const presentation = getNotificationPresentation(notification.type)
    notificationsByGroup[presentation.group].push(notification)
  }

  const notificationSections = (Object.entries(notificationsByGroup) as Array<
    [keyof typeof notificationsByGroup, NotificationRow[]]
  >)
    .filter(([, items]) => items.length > 0)
    .map(([group, items]) => ({
      group,
      items,
      unread: items.filter((item) => !item.read_at).length,
      label: getNotificationPresentation(items[0].type).groupLabel,
    }))

  return (
    <main className="min-h-screen bg-zinc-950 pt-32 text-white">
      <AppHeader
        current="notifications"
        isSignedIn
        unreadTradeOffers={unreadTradeOffers}
        unreadNotifications={unreadNotifications}
      />

      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/decks"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10"
            >
              {'<-'} Back to marketplace
            </Link>
            <Link
              href="/trade-offers"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
            >
              Trade Offers
            </Link>
          </div>

          <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-300">
                Activity Inbox
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight">Notifications</h1>
              <p className="mt-3 text-zinc-400">
                New offers, counteroffers, comments, and escrow handoff milestones will show up here.
              </p>
            </div>

            {unreadNotifications > 0 && (
              <form action={markAllReadAction}>
                <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10">
                  Mark all as read
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        {notifications.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-12 text-center">
            <h2 className="text-2xl font-semibold">No notifications yet</h2>
            <p className="mt-3 text-zinc-400">
              Once deck comments, trade offers, and trade-state changes happen, they&apos;ll collect here.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-4">
              {notificationSections.map((section) => {
                const styles = GROUP_STYLES[section.group]
                return (
                  <div key={section.group} className={`rounded-3xl border p-5 ${styles.card}`}>
                    <div className="text-sm text-zinc-300">{section.label}</div>
                    <div className={`mt-2 text-3xl font-semibold ${styles.count}`}>{section.items.length}</div>
                    <div className="mt-2 text-xs text-zinc-400">
                      {section.unread > 0 ? `${section.unread} unread` : 'All caught up'}
                    </div>
                  </div>
                )
              })}
            </div>

            {notificationSections.map((section) => {
              const styles = GROUP_STYLES[section.group]

              return (
                <div key={section.group}>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-semibold text-white">{section.label}</h2>
                      <p className="mt-1 text-sm text-zinc-400">
                        {section.unread > 0
                          ? `${section.unread} unread items need attention.`
                          : 'Recent activity and completed updates.'}
                      </p>
                    </div>
                    <div className={`rounded-full border px-3 py-1 text-xs ${styles.pill}`}>
                      {section.items.length} items
                    </div>
                  </div>

                  <div className="space-y-4">
                    {section.items.map((notification) => {
                      const unread = !notification.read_at
                      const presentation = getNotificationPresentation(notification.type)

                      return (
                        <div
                          key={notification.id}
                          className={`rounded-3xl border p-5 ${
                            unread
                              ? 'border-emerald-400/25 bg-emerald-400/10'
                              : 'border-white/10 bg-white/5'
                          }`}
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                {unread && (
                                  <span className="rounded-full bg-emerald-400/20 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-emerald-200">
                                    New
                                  </span>
                                )}
                                <span className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-wide ${styles.pill}`}>
                                  {presentation.typeLabel}
                                </span>
                              </div>
                              <h3 className="mt-3 text-lg font-semibold text-white">{notification.title}</h3>
                              {notification.body && (
                                <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-300">{notification.body}</p>
                              )}
                              <div className="mt-3 text-xs text-zinc-500">
                                {formatNotificationTimestamp(notification.created_at)}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                              {notification.href && (
                                <Link
                                  href={notification.href}
                                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
                                >
                                  {presentation.actionLabel}
                                </Link>
                              )}
                              {unread && (
                                <form action={markReadAction}>
                                  <input type="hidden" name="notification_id" value={notification.id} />
                                  <button className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-zinc-200 hover:bg-black/30">
                                    Mark read
                                  </button>
                                </form>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
