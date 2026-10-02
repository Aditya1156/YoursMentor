import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/session'
import {
  NotificationList,
  type NotificationItem,
  type PendingReschedule,
  type SentReschedule,
} from '@/components/notifications/notification-list'

export const metadata: Metadata = { title: 'Notifications' }
// Always fresh: the whole point is to show what just happened.
export const dynamic = 'force-dynamic'

/**
 * Shared by every role. A mentor, a student and an admin get notified about
 * different things but want the same page.
 *
 * Requests that need a decision come from my_pending_reschedules() rather than
 * from the notification rows, so they are listed correctly even if the
 * notification was missed or already marked read.
 */
export default async function NotificationsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/signin?next=/notifications')

  const supabase = await createClient()

  const [list, pendingRes, sentRes] = await Promise.all([
    supabase
      .from('notifications')
      .select('id, type, title, body, link, read, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.rpc('my_pending_reschedules'),
    supabase.rpc('my_sent_reschedules'),
  ])

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const notifications: NotificationItem[] = (list.data ?? []).map((n: any) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body ?? null,
    link: n.link ?? null,
    read: n.read,
    createdAt: n.created_at,
  }))

  const pending: PendingReschedule[] = (pendingRes.data ?? []).map((r: any) => ({
    requestId: r.request_id,
    sessionId: r.session_id,
    sessionTitle: r.session_title,
    currentStart: r.current_start,
    proposedStart: r.proposed_start,
    reason: r.reason ?? null,
    requestedByName: r.requested_by_name,
  }))

  const sent: SentReschedule[] = (sentRes.data ?? []).map((r: any) => ({
    requestId: r.request_id,
    sessionTitle: r.session_title,
    currentStart: r.current_start,
    proposedStart: r.proposed_start,
  }))
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const unread = notifications.filter((n) => !n.read).length

  return (
    <div className="container-page max-w-3xl py-8">
      <h1 className="text-2xl font-extrabold tracking-tight">Notifications</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {pending.length > 0
          ? `${pending.length} ${pending.length === 1 ? 'request needs' : 'requests need'} your answer.`
          : unread > 0
            ? `${unread} unread.`
            : 'You are up to date.'}
      </p>

      <div className="mt-6">
        <NotificationList notifications={notifications} pending={pending} sent={sent} />
      </div>
    </div>
  )
}
