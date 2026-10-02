import type { Metadata } from 'next'
import { IndianRupee, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/states'
import { LocalTime } from '@/components/shared/local-time'
import { mentorEarnings, mentorPayouts } from '@/lib/queries/mentor-dashboard'
import { formatINR } from '@/lib/utils'

export const metadata: Metadata = { title: 'Earnings' }
export const dynamic = 'force-dynamic'

/** M6 — Earnings and payouts. */
export default async function EarningsPage() {
  const [earnings, payouts] = await Promise.all([
    mentorEarnings().catch(() => ({ rows: [], commission: 25, totalNet: 0, totalGross: 0 })),
    mentorPayouts().catch(() => []),
  ])

  const paid = payouts.filter((p) => p.status === 'paid').reduce((t, p) => t + p.amount, 0)
  const owed = earnings.totalNet - paid

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl">Earnings</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          You earn on who attends. A no-show still counts, because you showed up.
          Payouts are made by hand each cycle to the UPI ID on your profile.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Earned, all time', value: formatINR(earnings.totalNet), icon: IndianRupee },
          { label: 'Paid out', value: formatINR(paid), icon: Wallet },
          { label: 'Due to you', value: formatINR(Math.max(0, owed)), icon: Wallet, highlight: true },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <s.icon className="size-4 text-subtle-foreground" aria-hidden />
            <p className={`mt-3 text-xl font-extrabold leading-none ${s.highlight ? 'text-success' : ''}`}>
              {s.value}
            </p>
            <p className="mt-1.5 text-xs font-medium text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg">Per session</h2>
          <Badge tone="neutral">Platform share {earnings.commission}%</Badge>
        </div>
        {earnings.rows.length === 0 ? (
          <EmptyState
            icon={<IndianRupee aria-hidden />}
            title="Nothing earned yet"
            description="Earnings appear here once a session completes and attendance is marked."
          />
        ) : (
          <Card className="divide-y divide-border-subtle">
            {earnings.rows.map((r) => (
              <div key={r.sessionId} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{r.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    <LocalTime iso={r.startAt} /> · {r.seatsPaid}{' '}
                    {r.seatsPaid === 1 ? 'seat' : 'seats'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-base font-extrabold text-success">{formatINR(r.net)}</p>
                  <p className="text-[0.6875rem] text-subtle-foreground">
                    {formatINR(r.gross)} less {formatINR(r.platformFee)}
                  </p>
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>

      {payouts.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg">Payout history</h2>
          <Card className="divide-y divide-border-subtle">
            {payouts.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div>
                  <p className="text-sm font-semibold">
                    {new Date(p.periodStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    {' – '}
                    {new Date(p.periodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  {p.reference && (
                    <p className="text-xs text-muted-foreground">Ref {p.reference}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{formatINR(p.amount)}</span>
                  <Badge tone={p.status === 'paid' ? 'green' : 'amber'}>{p.status}</Badge>
                </div>
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  )
}
