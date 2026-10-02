import { createClient } from '@/lib/supabase/server'
import type { SessionSummary, Track } from '@/lib/types'

/* eslint-disable @typescript-eslint/no-explicit-any */
const toSession = (r: any): SessionSummary => {
  const m = r.mentor_profiles ?? {}
  const p = m.profiles ?? {}
  return {
    id: r.id,
    mentorId: r.mentor_id,
    mentorName: p.name ?? 'Mentor',
    mentorAvatarUrl: p.avatar_url ?? undefined,
    mentorCompany: m.company ?? undefined,
    type: r.type,
    title: r.title,
    description: r.description ?? undefined,
    track: r.track ?? undefined,
    topic: r.topic ?? undefined,
    startAt: r.start_at,
    endAt: r.end_at,
    capacity: r.capacity,
    seatsBooked: r.seats_booked,
    minSeats: r.min_seats,
    price: r.price,
    status: r.status,
  }
}

const WITH_MENTOR =
  '*, mentor_profiles!inner(company, profiles!inner(name, avatar_url))'

export interface SessionFilters {
  track?: Track
  topic?: string
  from?: string
  to?: string
  limit?: number
}

/** P4 — upcoming group sessions. */
export async function listGroupSessions(f: SessionFilters = {}) {
  const supabase = await createClient()
  let query = supabase
    .from('sessions')
    .select(WITH_MENTOR)
    .eq('type', 'group')
    .eq('status', 'scheduled')
    .gte('start_at', f.from ?? new Date().toISOString())
    .order('start_at', { ascending: true })

  if (f.track) query = query.eq('track', f.track)
  if (f.topic) query = query.eq('topic', f.topic)
  if (f.to) query = query.lte('start_at', f.to)
  if (f.limit) query = query.limit(f.limit)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map(toSession)
}

/** P5 — one session. */
export async function getSession(id: string): Promise<SessionSummary | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('sessions')
    .select(WITH_MENTOR)
    .eq('id', id)
    .maybeSingle()
  return data ? toSession(data) : null
}

/** The group sessions a given mentor is running, for their profile page. */
export async function mentorGroupSessions(mentorId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('sessions')
    .select(WITH_MENTOR)
    .eq('mentor_id', mentorId)
    .eq('type', 'group')
    .eq('status', 'scheduled')
    .gte('start_at', new Date().toISOString())
    .order('start_at', { ascending: true })
  return (data ?? []).map(toSession)
}
