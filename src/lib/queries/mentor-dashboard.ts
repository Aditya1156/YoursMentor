import { createClient } from '@/lib/supabase/server'
import type { SessionSummary } from '@/lib/types'

/* eslint-disable @typescript-eslint/no-explicit-any */
const toSession = (r: any, mentorName = 'You'): SessionSummary => ({
  id: r.id, mentorId: r.mentor_id, mentorName,
  type: r.type, title: r.title, description: r.description ?? undefined,
  track: r.track ?? undefined, topic: r.topic ?? undefined,
  startAt: r.start_at, endAt: r.end_at,
  capacity: r.capacity, seatsBooked: r.seats_booked,
  minSeats: r.min_seats, price: r.price, status: r.status,
})

/** Every session this mentor runs, split by where it sits in time. */
export async function mentorSessions() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { upcoming: [], past: [], cancelled: [], needNotes: [] }

  const { data } = await supabase
    .from('sessions')
    .select('*')
    .eq('mentor_id', user.id)
    .order('start_at', { ascending: false })

  const all = (data ?? []).map((r) => toSession(r))
  const now = Date.now()

  return {
    upcoming: all
      .filter((s) => s.status === 'scheduled' && new Date(s.endAt).getTime() > now)
      .reverse(),
    past: all.filter((s) => s.status === 'completed'),
    cancelled: all.filter((s) => s.status === 'cancelled'),
    // Completed, had attendees, and no write-up yet.
    needNotes: all.filter(
      (s) => s.status === 'completed' && s.seatsBooked > 0 && !s.description
    ),
  }
}

/** Where a session sits relative to now. Computed here because a component
 *  that reads the clock during render is impure. */
export async function sessionTiming(startAt: string) {
  const now = Date.now()
  return {
    started: new Date(startAt).getTime() <= now,
    startsInHours: (new Date(startAt).getTime() - now) / 3_600_000,
  }
}

export async function sessionAttendees(sessionId: string) {
  const supabase = await createClient()
  const { data } = await supabase.rpc('session_attendees', { p_session: sessionId })
  return (data ?? []).map((a: any) => ({
    bookingId: a.booking_id, studentId: a.student_id,
    name: a.name, college: a.college ?? undefined,
    avatarUrl: a.avatar_url ?? undefined, status: a.status,
  }))
}

export interface EarningRow {
  sessionId: string
  title: string
  startAt: string
  type: 'group' | 'one_on_one'
  seatsPaid: number
  gross: number
  platformFee: number
  net: number
}

export async function mentorEarnings(): Promise<{
  rows: EarningRow[]
  commission: number
  totalNet: number
  totalGross: number
}> {
  const supabase = await createClient()
  const commission = Number(process.env.PLATFORM_COMMISSION_PERCENT ?? 25)
  const { data } = await supabase.rpc('mentor_earnings', { p_commission: commission })
  const rows: EarningRow[] = (data ?? []).map((r: any) => ({
    sessionId: r.session_id, title: r.title, startAt: r.start_at,
    type: r.session_type as 'group' | 'one_on_one',
    seatsPaid: r.seats_paid, gross: r.gross,
    platformFee: r.platform_fee, net: r.net,
  }))
  return {
    rows,
    commission,
    totalNet: rows.reduce((t, r) => t + r.net, 0),
    totalGross: rows.reduce((t, r) => t + r.gross, 0),
  }
}

export async function mentorAvailability() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { rules: [], blocked: [] }

  const [{ data: rules }, { data: blocked }] = await Promise.all([
    supabase.from('availability_rules').select('*').eq('mentor_id', user.id)
      .order('day_of_week').order('start_time'),
    supabase.from('blocked_dates').select('*').eq('mentor_id', user.id)
      .gte('date', new Date().toISOString().slice(0, 10)).order('date'),
  ])

  return {
    rules: (rules ?? []).map((r: any) => ({
      id: r.id, dayOfWeek: r.day_of_week,
      startTime: r.start_time.slice(0, 5), endTime: r.end_time.slice(0, 5),
      timezone: r.timezone,
    })),
    blocked: (blocked ?? []).map((b: any) => ({ date: b.date, reason: b.reason ?? undefined })),
  }
}

export async function mentorPayouts() {
  const supabase = await createClient()
  const { data } = await supabase.from('payouts').select('*')
    .order('period_start', { ascending: false })
  return (data ?? []).map((p: any) => ({
    id: p.id, periodStart: p.period_start, periodEnd: p.period_end,
    amount: p.amount, status: p.status as 'pending' | 'paid',
    paidAt: p.paid_at ?? undefined, reference: p.reference ?? undefined,
  }))
}
