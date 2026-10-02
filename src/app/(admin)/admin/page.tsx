import type { Metadata } from 'next'
import Link from 'next/link'
import {
  BadgePercent, CalendarRange, Flag, IndianRupee, UserCheck, Users, Wallet,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { adminStats, recentActivity } from '@/lib/queries/admin'
import { formatINR } from '@/lib/utils'

export const metadata: Metadata = { title: 'Admin overview', robots: { index: false } }
export const dynamic = 'force-dynamic'

/** AD1 — Admin overview. */
export default async function AdminOverviewPage() {
  const [s, activity] = await Promise.all([
    adminStats().catch(() => null),
    recentActivity().catch(() => []),
  ])

  if (!s) {
    return (
      <Card className="p-6">
        <h1 className="text-xl">Overview unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The admin queries need <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> in
          the environment.
        </p>
      </Card>
    )
  }

  const tiles = [
    { label: 'Students', value: s.students, icon: Users, href: '/admin/users' },
    { label: 'Approved mentors', value: s.mentorsApproved, icon: UserCheck, href: '/admin/mentors?status=approved' },
    { label: 'Awaiting review', value: s.mentorsPending, icon: UserCheck, href: '/admin/mentors', urgent: s.mentorsPending > 0 },
    { label: 'Sessions this week', value: s.sessionsThisWeek, icon: CalendarRange, href: '/admin/bookings' },
    { label: 'Paid bookings', value: s.bookingsConfirmed, icon: CalendarRange, href: '/admin/bookings' },
    { label: 'Revenue', value: formatINR(s.revenuePaise), icon: IndianRupee, href: '/admin/bookings' },
    { label: 'Credits outstanding', value: formatINR(s.creditsOutstanding), icon: Wallet, href: '/admin/users' },
    { label: 'Open reports', value: s.openReports, icon: Flag, href: '/admin/reports', urgent: s.openReports > 0 },
    { label: 'Live coupons', value: s.activeCoupons, icon: BadgePercent, href: '/admin/coupons' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything happening on YoursMentor.in right now.
        </p>
      </div>

      {(s.mentorsPending > 0 || s.openReports > 0) && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-accent bg-accent-soft p-4">
          <p className="text-sm font-semibold text-accent-soft-foreground">
            {s.mentorsPending > 0 && `${s.mentorsPending} mentor ${s.mentorsPending === 1 ? 'application' : 'applications'} waiting`}
            {s.mentorsPending > 0 && s.openReports > 0 && ' · '}
            {s.openReports > 0 && `${s.openReports} open ${s.openReports === 1 ? 'report' : 'reports'}`}
          </p>
          <div className="flex gap-2">
            {s.mentorsPending > 0 && (
              <Link href="/admin/mentors" className="text-xs font-bold text-primary hover:underline">
                Review applications →
              </Link>
            )}
            {s.openReports > 0 && (
              <Link href="/admin/reports" className="text-xs font-bold text-primary hover:underline">
                Open reports →
              </Link>
            )}
          </div>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href}>
            <Card interactive className="h-full p-4">
              <div className="flex items-start justify-between gap-2">
                <t.icon className="size-4 text-subtle-foreground" aria-hidden />
                {t.urgent && <Badge tone="amber">Needs you</Badge>}
              </div>
              <p className="mt-3 text-2xl font-extrabold leading-none">{t.value}</p>
              <p className="mt-1.5 text-xs font-medium text-muted-foreground">{t.label}</p>
            </Card>
          </Link>
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-lg">Recent admin activity</h2>
        {activity.length === 0 ? (
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">
              Nothing yet. Approvals, refunds and suspensions are logged here with who did them.
            </p>
          </Card>
        ) : (
          <Card className="divide-y divide-border-subtle">
            {activity.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 p-3.5">
                <p className="text-sm">
                  <span className="font-semibold">{a.adminName}</span>{' '}
                  <span className="text-muted-foreground">{a.action.replace(/_/g, ' ')}</span>{' '}
                  <Badge tone="neutral">{a.targetType}</Badge>
                </p>
                <time className="text-xs text-subtle-foreground" dateTime={a.createdAt}>
                  {new Date(a.createdAt).toLocaleString('en-IN')}
                </time>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  )
}
