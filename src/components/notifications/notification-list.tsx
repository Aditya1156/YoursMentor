'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Bell, CalendarClock, CalendarX, Check, CheckCheck, CreditCard, Loader2, Star, Video, X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export interface NotificationItem {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read: boolean
  createdAt: string
}

export interface PendingReschedule {
  requestId: string
  sessionId: string
  sessionTitle: string
  currentStart: string
  proposedStart: string
  reason: string | null
  requestedByName: string
  kind: string
}

export interface SentReschedule {
  requestId: string
  sessionTitle: string
  currentStart: string
  proposedStart: string
  kind: string
}

const WHEN = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
})

/** A small icon per kind, so the list is scannable rather than a wall of text. */
function iconFor(type: string) {
  if (type.startsWith('start_now')) return Video
  if (type.startsWith('reschedule')) return CalendarClock
  if (type.includes('cancel')) return CalendarX
  if (type.includes('confirm') || type.includes('payment')) return CreditCard
  if (type.includes('review') || type.includes('rate')) return Star
  return Bell
}

function ago(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  return days === 1 ? 'yesterday' : `${days}d ago`
}

/**
 * The notifications page.
 *
 * Anything that needs a decision is lifted to the top and answerable in place.
 * A notification is only a record that something happened — it can be read,
 * missed or deleted — so what is still waiting is read from the requests
 * themselves. That means a mentor who ignored the email, or marked the
 * notification read by accident, still finds the request here.
 */
export function NotificationList({
  notifications, pending, sent,
}: {
  notifications: NotificationItem[]
  pending: PendingReschedule[]
  sent: SentReschedule[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const unread = notifications.filter((n) => !n.read).length

  const joinNow = useCallback(
    async (requestId: string) => {
      setBusy(requestId)
      setError(null)
      const { data, error: rpcError } = await createClient()
        .rpc('accept_start_now', { p_request: requestId })
      setBusy(null)
      if (rpcError) {
        setError(rpcError.message)
        return
      }
      // Straight in — the room is what they just agreed to.
      router.push(`/room/${data as string}`)
    },
    [router]
  )

  const declineNow = useCallback(
    async (requestId: string) => {
      setBusy(requestId)
      setError(null)
      const { error: rpcError } = await createClient()
        .rpc('decline_start_now', { p_request: requestId })
      setBusy(null)
      if (rpcError) {
        setError(rpcError.message)
        return
      }
      router.refresh()
    },
    [router]
  )

  const respond = useCallback(
    async (requestId: string, accept: boolean) => {
      setBusy(requestId)
      setError(null)
      const { error: rpcError } = await createClient().rpc('respond_to_reschedule', {
        p_request: requestId, p_accept: accept,
      })
      setBusy(null)
      if (rpcError) {
        setError(rpcError.message)
        return
      }
      router.refresh()
    },
    [router]
  )

  const withdraw = useCallback(
    async (requestId: string) => {
      setBusy(requestId)
      setError(null)
      const { error: rpcError } = await createClient()
        .rpc('withdraw_reschedule', { p_request: requestId })
      setBusy(null)
      if (rpcError) {
        setError(rpcError.message)
        return
      }
      router.refresh()
    },
    [router]
  )

  async function markAllRead() {
    setBusy('all')
    await createClient().rpc('mark_all_notifications_read')
    setBusy(null)
    router.refresh()
  }

  async function open(n: NotificationItem) {
    if (!n.read) {
      await createClient().rpc('mark_notification_read', { p_notification: n.id })
      router.refresh()
    }
    if (n.link) router.push(n.link)
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p className="rounded-[var(--radius-sm)] border border-danger bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">
          {error}
        </p>
      )}

      {/* ------------------------------------------------ needs an answer -- */}
      {pending.length > 0 && (
        <section>
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-subtle-foreground">
            Needs your answer
          </h2>
          <ul className="mt-2 flex flex-col gap-3">
            {pending.map((p) => p.kind === 'start_now' ? (
              <li key={p.requestId}>
                <Card className="border-cta-group bg-cta-group/10 p-4">
                  <div className="flex items-start gap-3">
                    <Video className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.9375rem] font-bold leading-snug">
                        {p.requestedByName} wants to start &ldquo;{p.sessionTitle}&rdquo; right now
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        They are online and waiting. Joining opens the room
                        immediately — it does not change your booked time if you
                        would rather not.
                      </p>
                      <p className="mt-1 text-xs text-subtle-foreground">
                        Booked for {WHEN.format(new Date(p.currentStart))}. This
                        request lapses after five minutes.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="group"
                          disabled={busy === p.requestId}
                          onClick={() => void joinNow(p.requestId)}
                        >
                          {busy === p.requestId
                            ? <Loader2 className="animate-spin" aria-hidden />
                            : <Video aria-hidden />}
                          Join now
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy === p.requestId}
                          onClick={() => void declineNow(p.requestId)}
                        >
                          Not right now
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </li>
            ) : (
              <li key={p.requestId}>
                <Card className="border-accent bg-accent-soft p-4">
                  <div className="flex items-start gap-3">
                    <CalendarClock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.9375rem] font-bold leading-snug">
                        {p.requestedByName} wants to move &ldquo;{p.sessionTitle}&rdquo;
                      </p>
                      <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
                            Booked for
                          </dt>
                          <dd className="font-semibold line-through decoration-subtle-foreground/60">
                            {WHEN.format(new Date(p.currentStart))}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
                            They suggest
                          </dt>
                          <dd className="font-extrabold text-primary">
                            {WHEN.format(new Date(p.proposedStart))}
                          </dd>
                        </div>
                      </dl>
                      {p.reason && (
                        <p className="mt-2 text-sm italic text-muted-foreground">
                          &ldquo;{p.reason}&rdquo;
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={busy === p.requestId}
                          onClick={() => void respond(p.requestId, true)}
                        >
                          {busy === p.requestId
                            ? <Loader2 className="animate-spin" aria-hidden />
                            : <Check aria-hidden />}
                          Accept {WHEN.format(new Date(p.proposedStart))}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy === p.requestId}
                          onClick={() => void respond(p.requestId, false)}
                        >
                          Keep the original time
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ----------------------------------------------- waiting on them -- */}
      {sent.length > 0 && (
        <section>
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-subtle-foreground">
            Waiting on them
          </h2>
          <ul className="mt-2 flex flex-col gap-3">
            {sent.map((s) => (
              <li key={s.requestId}>
                <Card className="flex flex-wrap items-center justify-between gap-3 border-dashed p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold leading-snug">{s.sessionTitle}</p>
                    {s.kind === 'start_now' ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        You asked them to start now. Reload once they accept, or wait
                        on the session list and it will take you in.
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">
                        You asked to move it to{' '}
                        <span className="font-semibold text-foreground">
                          {WHEN.format(new Date(s.proposedStart))}
                        </span>
                        . Still on at {WHEN.format(new Date(s.currentStart))} until they agree.
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy === s.requestId}
                    onClick={() => void withdraw(s.requestId)}
                  >
                    {busy === s.requestId && <Loader2 className="animate-spin" aria-hidden />}
                    <X aria-hidden /> Withdraw
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ------------------------------------------------------- the list -- */}
      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-subtle-foreground">
            Everything else
          </h2>
          {unread > 0 && (
            <Button size="sm" variant="ghost" disabled={busy === 'all'} onClick={() => void markAllRead()}>
              {busy === 'all'
                ? <Loader2 className="animate-spin" aria-hidden />
                : <CheckCheck aria-hidden />}
              Mark all read
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <Card className="mt-2 p-8 text-center">
            <Bell className="mx-auto size-6 text-subtle-foreground" aria-hidden />
            <p className="mt-2 text-sm font-semibold">Nothing yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Booking confirmations, reminders and reschedule requests land here.
            </p>
          </Card>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {notifications.map((n) => {
              const Icon = iconFor(n.type)
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => void open(n)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-[var(--radius-md)] border p-3 text-left transition-colors',
                      n.read
                        ? 'border-border bg-surface hover:bg-surface-muted'
                        : 'border-primary/40 bg-primary-soft hover:bg-primary-soft/80'
                    )}
                  >
                    <Icon
                      className={cn('mt-0.5 size-4 shrink-0',
                        n.read ? 'text-subtle-foreground' : 'text-primary')}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className={cn('text-sm leading-snug',
                          n.read ? 'font-semibold' : 'font-extrabold')}>
                          {n.title}
                        </span>
                        {!n.read && <Badge tone="indigo">New</Badge>}
                      </span>
                      {n.body && (
                        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                          {n.body}
                        </span>
                      )}
                      <span className="mt-1 block text-[0.6875rem] text-subtle-foreground">
                        {ago(n.createdAt)}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <p className="text-center text-xs text-subtle-foreground">
        <Link href="/settings" className="font-semibold hover:underline">
          Email preferences
        </Link>{' '}
        are in settings.
      </p>
    </div>
  )
}
