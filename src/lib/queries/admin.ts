import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Admin reads go through the service role rather than RLS. The panel needs
 * counts across every row — pending mentors, open reports, revenue — and RLS
 * is built to hide exactly those from the person reading. The route group and
 * every write path check the role before any of this is reached.
 */
export interface AdminStats {
  students: number
  mentorsApproved: number
  mentorsPending: number
  sessionsThisWeek: number
  bookingsConfirmed: number
  revenuePaise: number
  openReports: number
  creditsOutstanding: number
  activeCoupons: number
}

export async function adminStats(): Promise<AdminStats> {
  const db = createAdminClient()
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString()

  const count = async (table: string, build?: (q: any) => any) => {   // eslint-disable-line @typescript-eslint/no-explicit-any
    let q = db.from(table).select('*', { count: 'exact', head: true })
    if (build) q = build(q)
    const { count: n } = await q
    return n ?? 0
  }

  const [
    students, mentorsApproved, mentorsPending, sessionsThisWeek,
    bookingsConfirmed, openReports, activeCoupons,
  ] = await Promise.all([
    count('profiles', (q) => q.eq('role', 'student')),
    count('mentor_profiles', (q) => q.eq('status', 'approved')),
    count('mentor_profiles', (q) => q.eq('status', 'pending')),
    count('sessions', (q) => q.gte('start_at', weekAgo)),
    count('bookings', (q) => q.in('status', ['confirmed', 'attended'])),
    count('reports', (q) => q.eq('status', 'open')),
    count('coupons', (q) => q.eq('active', true)),
  ])

  const { data: paid } = await db.from('payments').select('amount').eq('status', 'paid')
  const { data: ledger } = await db.from('credit_ledger').select('amount')

  return {
    students, mentorsApproved, mentorsPending, sessionsThisWeek,
    bookingsConfirmed, openReports, activeCoupons,
    revenuePaise: (paid ?? []).reduce((t, r) => t + (r.amount ?? 0), 0),
    creditsOutstanding: (ledger ?? []).reduce((t, r) => t + (r.amount ?? 0), 0),
  }
}

export async function recentActivity(limit = 12) {
  const db = createAdminClient()
  const { data } = await db
    .from('admin_actions')
    .select('*, profiles!admin_actions_admin_id_fkey(name)')
    .order('created_at', { ascending: false })
    .limit(limit)
  /* eslint-disable @typescript-eslint/no-explicit-any */
  return (data ?? []).map((a: any) => ({
    id: a.id, action: a.action, targetType: a.target_type,
    detail: a.detail, createdAt: a.created_at,
    adminName: a.profiles?.name ?? 'System',
  }))
}

export async function listCoupons() {
  const db = createAdminClient()
  const { data } = await db.from('coupons').select('*').order('created_at', { ascending: false })
  /* eslint-disable @typescript-eslint/no-explicit-any */
  return (data ?? []).map((c: any) => ({
    id: c.id, code: c.code, description: c.description ?? undefined,
    kind: c.kind as 'percent' | 'flat', value: c.value,
    maxDiscount: c.max_discount ?? undefined, minAmount: c.min_amount,
    scope: c.scope as string,
    maxRedemptions: c.max_redemptions ?? undefined,
    maxPerUser: c.max_redemptions_per_user,
    timesRedeemed: c.times_redeemed,
    startsAt: c.starts_at, expiresAt: c.expires_at ?? undefined,
    active: c.active,
  }))
}
export type CouponRow = Awaited<ReturnType<typeof listCoupons>>[number]

export async function listStudents(search?: string, limit = 50) {
  const db = createAdminClient()
  let q = db
    .from('profiles')
    .select('id, name, role, status, college, college_tier, home_state, onboarding_complete, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (search) q = q.ilike('name', `%${search.replace(/[%_]/g, '')}%`)
  const { data } = await q
  /* eslint-disable @typescript-eslint/no-explicit-any */
  return (data ?? []).map((p: any) => ({
    id: p.id, name: p.name, role: p.role, status: p.status,
    college: p.college ?? undefined, collegeTier: p.college_tier ?? undefined,
    homeState: p.home_state ?? undefined,
    onboardingComplete: p.onboarding_complete, createdAt: p.created_at,
  }))
}
export type StudentRow = Awaited<ReturnType<typeof listStudents>>[number]
