'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, Clock, Loader2, ShieldCheck, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { ErrorBanner } from '@/components/auth/error-banner'
import { LocalTime } from '@/components/shared/local-time'
import { formatINR } from '@/lib/utils'
import type { BookingStatus } from '@/lib/types'

interface Props {
  booking: {
    id: string
    status: BookingStatus
    amount: number
    holdExpiresAt?: string
    session: {
      id: string
      title: string
      startAt: string
      endAt: string
      mentorName: string
      mentorAvatarUrl?: string
    }
  }
  creditBalance: number
  razorpayEnabled: boolean
}

/** Razorpay's checkout script, loaded only when someone actually pays. */
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false)
    if ((window as unknown as { Razorpay?: unknown }).Razorpay) return resolve(true)
    const el = document.createElement('script')
    el.src = 'https://checkout.razorpay.com/v1/checkout.js'
    el.onload = () => resolve(true)
    el.onerror = () => resolve(false)
    document.body.appendChild(el)
  })
}

export function CheckoutPanel({ booking, creditBalance, razorpayEnabled }: Props) {
  const router = useRouter()
  const [useCredits, setUseCredits] = useState(creditBalance > 0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [left, setLeft] = useState<number | null>(null)

  const creditsApplied = useCredits ? Math.min(creditBalance, booking.amount) : 0
  const toPay = booking.amount - creditsApplied

  // The hold is a real 10-minute window the database enforces. Showing it is
  // the honest thing: the seat genuinely goes back if they stall.
  useEffect(() => {
    if (!booking.holdExpiresAt) return
    const tick = () => {
      const ms = new Date(booking.holdExpiresAt!).getTime() - Date.now()
      setLeft(Math.max(0, Math.floor(ms / 1000)))
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [booking.holdExpiresAt])

  const expired = left !== null && left <= 0
  const clock = useMemo(() => {
    if (left === null) return null
    return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
  }, [left])

  /**
   * Opens Razorpay. The handler callback is only a hint that the student got
   * through the modal — the seat is confirmed by the webhook, which is the
   * only path that verifies a signature. So this polls the booking rather than
   * trusting the callback.
   */
  async function openRazorpay(data: {
    razorpayOrderId: string
    razorpayKeyId: string
    amount: number
  }) {
    const ok = await loadRazorpayScript()
    if (!ok) {
      setError('Could not reach the payment window. Check your connection.')
      return
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const rzp = new (window as any).Razorpay({
      key: data.razorpayKeyId,
      order_id: data.razorpayOrderId,
      amount: data.amount,
      currency: 'INR',
      name: 'YoursMentor.in',
      description: booking.session.title,
      image: '/brand/mark.svg',
      theme: { color: '#0069EE' },
      handler: () => {
        setBusy(true)
        void waitForConfirmation()
      },
      modal: {
        ondismiss: () => {
          setBusy(false)
          setError('Payment was cancelled. Your seat is still held for a few minutes.')
        },
      },
    })
    rzp.on('payment.failed', (res: any) => {
      setBusy(false)
      setError(res?.error?.description ?? 'That payment did not go through.')
    })
    rzp.open()
  }

  /** The webhook confirms the seat; this waits for it rather than assuming. */
  async function waitForConfirmation() {
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 1500))
      const res = await fetch(`/api/bookings/${booking.id}/status`, { cache: 'no-store' })
      if (res.ok) {
        const { status } = await res.json()
        if (status === 'confirmed' || status === 'attended') {
          router.push(`/booking/${booking.id}/confirmed`)
          return
        }
      }
    }
    setBusy(false)
    setError(
      'Your payment went through but we are still confirming it. ' +
        'Check My sessions in a minute — do not pay again.'
    )
  }

  async function pay() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/checkout/${booking.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useCredits }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Payment could not be started.')

      if (data.status === 'confirmed') {
        router.push(`/booking/${booking.id}/confirmed`)
        return
      }

      if (data.status === 'payment_required') {
        await openRazorpay(data)
        return
      }
      throw new Error('Payment is not available yet.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container-page max-w-2xl py-8 md:py-12">
      <h1 className="text-2xl">Confirm your seat</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        One step left. Your seat is held while you finish.
      </p>

      {expired ? (
        <Card className="mt-5 p-5">
          <ErrorBanner>
            Your 10-minute hold expired and the seat went back to the room.
          </ErrorBanner>
          <Button className="mt-4" full asChild>
            <Link href={`/sessions/${booking.session.id}`}>Try for another seat</Link>
          </Button>
        </Card>
      ) : (
        <>
          {clock && (
            <div className="mt-4 flex items-center gap-2 rounded-[var(--radius-md)] border border-accent bg-accent-soft px-4 py-3">
              <Clock className="size-4 shrink-0 text-accent-soft-foreground" aria-hidden />
              <p className="text-sm font-semibold text-accent-soft-foreground">
                Seat held for{' '}
                <span className="tabular-nums" aria-live="polite">{clock}</span>
              </p>
            </div>
          )}

          <Card className="mt-4 p-5">
            <h2 className="text-base">{booking.session.title}</h2>
            <div className="mt-3 flex items-center gap-2.5">
              <Avatar
                name={booking.session.mentorName}
                src={booking.session.mentorAvatarUrl}
                size="sm"
              />
              <div className="text-xs">
                <p className="font-semibold">{booking.session.mentorName}</p>
                <p className="text-muted-foreground">
                  <LocalTime iso={booking.session.startAt} />
                </p>
              </div>
            </div>

            <dl className="mt-5 flex flex-col gap-2 border-t border-border-subtle pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Seat</dt>
                <dd className="font-semibold">{formatINR(booking.amount)}</dd>
              </div>

              {creditBalance > 0 && (
                <div className="flex items-start justify-between gap-3">
                  <dt>
                    <label className="flex cursor-pointer items-center gap-2 text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={useCredits}
                        onChange={(e) => setUseCredits(e.target.checked)}
                        className="size-4 rounded-[4px] border-border accent-[var(--primary)]"
                      />
                      <Wallet className="size-3.5 text-primary" aria-hidden />
                      Use credits
                      <Badge tone="green">{formatINR(creditBalance)} available</Badge>
                    </label>
                  </dt>
                  <dd className="font-semibold text-success">
                    {creditsApplied > 0 ? `− ${formatINR(creditsApplied)}` : '—'}
                  </dd>
                </div>
              )}

              <div className="mt-2 flex justify-between border-t border-border-subtle pt-3">
                <dt className="font-bold">To pay</dt>
                <dd className="text-lg font-extrabold">{formatINR(toPay)}</dd>
              </div>
            </dl>

            <p className="mt-2 text-xs text-muted-foreground">
              Price includes all taxes. No hidden fees.
            </p>

            {error && <div className="mt-4"><ErrorBanner>{error}</ErrorBanner></div>}

            {toPay > 0 && !razorpayEnabled && (
              <div className="mt-4 flex items-start gap-2 rounded-[var(--radius-sm)] bg-surface-muted px-3.5 py-3 text-sm text-muted-foreground">
                <AlertCircle className="mt-px size-4 shrink-0" aria-hidden />
                Card and UPI payment is not switched on yet. You can still confirm a seat
                that your credits cover in full.
              </div>
            )}

            <Button
              variant="group"
              full
              size="lg"
              className="mt-4"
              disabled={busy || (toPay > 0 && !razorpayEnabled)}
              onClick={pay}
            >
              {busy && <Loader2 className="animate-spin" aria-hidden />}
              {toPay === 0 ? 'Confirm with credits' : `Pay ${formatINR(toPay)}`}
            </Button>
          </Card>

          <Card className="mt-4 p-4">
            <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <ShieldCheck className="mt-px size-4 shrink-0 text-success" aria-hidden />
              <span>
                Cancel more than 24 hours before the session for a full refund in credits.
                Under 24 hours there is no refund.{' '}
                <Link href="/refund-policy" className="font-semibold text-primary hover:underline">
                  Full policy
                </Link>
              </span>
            </p>
          </Card>
        </>
      )}
    </div>
  )
}
