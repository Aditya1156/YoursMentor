'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ErrorBanner } from '@/components/auth/error-banner'
import { cn, formatINR } from '@/lib/utils'

export interface PlanCard {
  code: string
  name: string
  description: string | null
  price: number
  groupSessions: number | null
  oneOnOnes: number
  durationDays: number
}

export interface CurrentSub {
  planCode: string
  expiresAt: string
  groupRemaining: number | null
  oneOnOneRemaining: number
}

const WHEN = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' })

/**
 * The plans, and what buying one does.
 *
 * The ₹99 single session stays on this page as a real column rather than being
 * hidden. Most people arriving here have booked nothing yet, and pushing a
 * monthly commitment at someone who has not met a mentor is how you lose them.
 */
export function PlanCards({
  plans, current, credits, signedIn,
}: {
  plans: PlanCard[]
  current: CurrentSub | null
  credits: number
  signedIn: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [coupon, setCoupon] = useState('')

  async function buy(code: string, price: number) {
    if (!signedIn) {
      router.push(`/signin?next=${encodeURIComponent('/pricing')}`)
      return
    }
    setBusy(code)
    setError(null)
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: code,
        useCredits: credits >= price,
        coupon: coupon.trim() || undefined,
      }),
    })
    const data = await res.json()
    setBusy(null)
    if (!res.ok) {
      setError(data.error ?? 'Could not start that plan.')
      return
    }
    if (data.status === 'active') {
      router.push('/dashboard')
      router.refresh()
      return
    }
    // Razorpay is not wired into this page yet; say so rather than hanging.
    setError('Card payment is not switched on yet. Credits can cover it for now.')
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <ErrorBanner>{error}</ErrorBanner>}

      {current && (
        <Card className="border-success bg-success-soft p-4">
          <p className="text-sm font-bold">
            Your {current.planCode === 'pro' ? 'Pro' : 'Pod'} plan is active until{' '}
            {WHEN.format(new Date(current.expiresAt))}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {current.groupRemaining === null
              ? 'Unlimited group sessions'
              : `${current.groupRemaining} group ${current.groupRemaining === 1 ? 'session' : 'sessions'}`}
            {current.oneOnOneRemaining > 0 && (
              <> and {current.oneOnOneRemaining} 1:1 {current.oneOnOneRemaining === 1 ? 'call' : 'calls'}</>
            )}{' '}
            left this cycle. Booking a session spends one automatically — there is
            nothing else to pay.
          </p>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {/* Pay as you go stays a real option. */}
        <Card className="flex flex-col p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-subtle-foreground">
            Pay as you go
          </p>
          <p className="mt-2 text-3xl font-extrabold">
            {formatINR(99)}
            <span className="text-sm font-medium text-muted-foreground"> / session</span>
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            One group room, no commitment. The right way to find out whether this
            is for you.
          </p>
          <ul className="mt-4 flex flex-1 flex-col gap-2 text-sm">
            {['Any ₹99 group session', 'Full refund in credit 24h ahead', 'No subscription']
              .map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                  {f}
                </li>
              ))}
          </ul>
          <Button variant="outline" full className="mt-5" asChild>
            <Link href="/sessions">Browse sessions</Link>
          </Button>
        </Card>

        {plans.map((plan) => {
          const isPro = plan.code === 'pro'
          const isCurrent = current?.planCode === plan.code
          const perSession = plan.groupSessions
            ? Math.round(plan.price / (plan.groupSessions + plan.oneOnOnes))
            : null
          return (
            <Card
              key={plan.code}
              className={cn('relative flex flex-col p-5', isPro && 'border-primary shadow-[var(--shadow-card)]')}
            >
              {isPro && (
                <Badge tone="indigo" className="absolute -top-2.5 left-5">
                  <Sparkles aria-hidden /> Most chosen
                </Badge>
              )}
              <p className="text-xs font-bold uppercase tracking-wider text-subtle-foreground">
                {plan.name}
              </p>
              <p className="mt-2 text-3xl font-extrabold">
                {formatINR(plan.price)}
                <span className="text-sm font-medium text-muted-foreground"> / month</span>
              </p>
              {perSession !== null && (
                <p className="mt-1 text-xs font-semibold text-success">
                  about {formatINR(perSession)} a session
                </p>
              )}
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {plan.description}
              </p>
              <ul className="mt-4 flex flex-1 flex-col gap-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                  {plan.groupSessions === null
                    ? 'Unlimited group sessions'
                    : `${plan.groupSessions} group sessions a month`}
                </li>
                {plan.oneOnOnes > 0 && (
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                    {plan.oneOnOnes} 1:1 {plan.oneOnOnes === 1 ? 'call' : 'calls'} a month
                  </li>
                )}
                {isPro && (
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                    Priority matching
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                  Cancel any time — what is left stays yours until it expires
                </li>
              </ul>

              <Button
                variant={isPro ? 'primary' : 'outline'}
                full
                className="mt-5"
                disabled={busy === plan.code || isCurrent}
                onClick={() => void buy(plan.code, plan.price)}
              >
                {busy === plan.code && <Loader2 className="animate-spin" aria-hidden />}
                {isCurrent
                  ? 'Your current plan'
                  : current
                    ? `Switch to ${plan.name}`
                    : signedIn
                      ? `Start ${plan.name}`
                      : 'Sign in to start'}
              </Button>
              {signedIn && credits >= plan.price && !isCurrent && (
                <p className="mt-1.5 text-center text-[0.6875rem] text-subtle-foreground">
                  Covered by your {formatINR(credits)} credit
                </p>
              )}
            </Card>
          )
        })}
      </div>

      {signedIn && (
        <div className="mx-auto flex w-full max-w-sm items-end gap-2">
          <div className="flex-1">
            <label htmlFor="coupon" className="text-xs font-semibold">
              Have a code?
            </label>
            <input
              id="coupon"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value.toUpperCase())}
              placeholder="FIRSTMONTH"
              maxLength={24}
              className="mt-1 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-sm font-semibold uppercase tracking-wide"
            />
          </div>
          <p className="pb-2 text-xs text-subtle-foreground">
            applied when you start a plan
          </p>
        </div>
      )}

      <p className="text-center text-xs leading-relaxed text-subtle-foreground">
        Prices include all taxes. A plan pays for sessions automatically — you will
        never be charged twice for the same seat. See the{' '}
        <Link href="/refund-policy" className="font-semibold hover:underline">
          refund policy
        </Link>
        .
      </p>
    </div>
  )
}
