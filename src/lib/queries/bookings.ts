import { createClient } from '@/lib/supabase/server'
import type { BookingSummary, SessionSummary } from '@/lib/types'

/* eslint-disable @typescript-eslint/no-explicit-any */
const toSession = (r: any): SessionSummary => {
  const m = r.mentor_profiles ?? {}
  const p = m.profiles ?? {}
  return {
    id: r.id, mentorId: r.mentor_id,
    mentorName: p.name ?? 'Mentor',
    mentorAvatarUrl: p.avatar_url ?? undefined,
    mentorCompany: m.company ?? undefined,
    type: r.type, title: r.title, description: r.description ?? undefined,
    track: r.track ?? undefined, topic: r.topic ?? undefined,
    startAt: r.start_at, endAt: r.end_at,
    capacity: r.capacity, seatsBooked: r.seats_booked,
    minSeats: r.min_seats, price: r.price, status: r.status,
  }
}

const SELECT =
  '*, sessions!inner(*, mentor_profiles!inner(company, profiles!inner(name, avatar_url))), reviews(id)'

/** S5 — the student's own bookings. RLS already scopes this to them. */
export async function myBookings(): Promise<BookingSummary[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('bookings')
    .select(SELECT)
    .order('created_at', { ascending: false })
  if (error) throw error

  return (data ?? []).map((b: any) => ({
    id: b.id,
    status: b.status,
    amount: b.amount,
    holdExpiresAt: b.hold_expires_at ?? undefined,
    createdAt: b.created_at,
    session: toSession(b.sessions),
    hasReview: (b.reviews ?? []).length > 0,
  }))
}

export async function getBooking(id: string): Promise<BookingSummary | null> {
  const supabase = await createClient()
  const { data } = await supabase.from('bookings').select(SELECT).eq('id', id).maybeSingle()
  if (!data) return null
  const b = data as any
  return {
    id: b.id, status: b.status, amount: b.amount,
    holdExpiresAt: b.hold_expires_at ?? undefined,
    createdAt: b.created_at,
    session: toSession(b.sessions),
    hasReview: (b.reviews ?? []).length > 0,
  }
}

export async function creditBalance(): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0
  const { data } = await supabase.rpc('credit_balance', { p_user: user.id })
  return Number(data ?? 0)
}

export async function creditHistory(limit = 20) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('credit_ledger')
    .select('id, amount, reason, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []).map((r: any) => ({
    id: r.id, amount: r.amount, reason: r.reason, createdAt: r.created_at,
  }))
}

export async function unreadNotificationCount(): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('read', false)
  return count ?? 0
}

export async function listNotifications(limit = 30) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []).map((n: any) => ({
    id: n.id, type: n.type, title: n.title,
    body: n.body ?? undefined, link: n.link ?? undefined,
    read: n.read, createdAt: n.created_at,
  }))
}

/** S1 — the matched mentors behind the quiz, with the reasons to show. */
export async function matchedMentors(limit = 5) {
  const supabase = await createClient()
  const { data: matches } = await supabase.rpc('matched_mentors', { p_limit: limit })
  if (!matches?.length) return []

  const ids = matches.map((m: any) => m.mentor_id)
  const { data: mentors } = await supabase
    .from('mentor_directory').select('*').in('id', ids)

  const byId = new Map((mentors ?? []).map((m: any) => [m.id, m]))
  return matches
    .map((m: any) => {
      const r = byId.get(m.mentor_id)
      if (!r) return null
      return {
        id: r.id, name: r.name,
        avatarUrl: r.avatar_url ?? undefined,
        headline: r.headline, company: r.company ?? undefined,
        collegeLine: r.college_line ?? undefined,
        collegeTier: r.college_tier ?? undefined,
        homeState: r.home_state ?? undefined,
        languages: r.languages ?? [],
        firstGenGraduate: !!r.first_gen_graduate,
        tracks: r.tracks ?? [], topics: r.topics ?? [],
        breakthroughStory: r.breakthrough_story ?? undefined,
        price1on1: r.price_1on1, session1on1Minutes: r.session_1on1_minutes,
        trialOffer: !!r.trial_offer,
        ratingAvg: Number(r.rating_avg ?? 0), ratingCount: r.rating_count ?? 0,
        sessionsCompleted: r.sessions_completed ?? 0, country: r.country ?? 'India',
        matchReasons: {
          sameLanguage: !!m.same_language,
          sameState: !!m.same_state,
          tierStep: !!m.tier_step,
          firstGen: !!m.first_gen,
        },
      }
    })
    .filter(Boolean)
}
