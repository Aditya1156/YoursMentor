import { createClient } from '@/lib/supabase/server'
import type { CollegeTier, MentorDetail, MentorSummary, Track } from '@/lib/types'

/* eslint-disable @typescript-eslint/no-explicit-any */
const toMentor = (r: any): MentorSummary => ({
  id: r.id,
  name: r.name,
  avatarUrl: r.avatar_url ?? undefined,
  headline: r.headline,
  company: r.company ?? undefined,
  companyDomain: r.company_domain ?? undefined,
  collegeLine: r.college_line ?? undefined,
  collegeTier: r.college_tier ?? undefined,
  homeState: r.home_state ?? undefined,
  languages: r.languages ?? [],
  firstGenGraduate: !!r.first_gen_graduate,
  tracks: r.tracks ?? [],
  topics: r.topics ?? [],
  breakthroughStory: r.breakthrough_story ?? undefined,
  price1on1: r.price_1on1,
  session1on1Minutes: r.session_1on1_minutes,
  trialOffer: !!r.trial_offer,
  ratingAvg: Number(r.rating_avg ?? 0),
  ratingCount: r.rating_count ?? 0,
  sessionsCompleted: r.sessions_completed ?? 0,
  country: r.country ?? 'India',
})

export interface MentorFilters {
  q?: string
  track?: Track
  topic?: string
  language?: string
  state?: string
  tier?: CollegeTier
  firstGen?: boolean
  minPrice?: number
  maxPrice?: number
  sort?: 'recommended' | 'rating' | 'price_low' | 'price_high'
  page?: number
  perPage?: number
}

export const PER_PAGE = 9

/** P2 — the mentor directory. Reads the `mentor_directory` view, which already
 *  filters to approved mentors on active accounts. */
export async function listMentors(f: MentorFilters = {}) {
  const supabase = await createClient()
  const page = Math.max(1, f.page ?? 1)
  const perPage = f.perPage ?? PER_PAGE
  const from = (page - 1) * perPage

  let query = supabase.from('mentor_directory').select('*', { count: 'exact' })

  if (f.q) {
    // ilike across the fields a student would actually type into.
    const term = `%${f.q.replace(/[%_]/g, '')}%`
    query = query.or(
      `name.ilike.${term},headline.ilike.${term},company.ilike.${term},college_line.ilike.${term}`
    )
  }
  if (f.track) query = query.contains('tracks', [f.track])
  if (f.topic) query = query.contains('topics', [f.topic])
  if (f.language) query = query.contains('languages', [f.language])
  if (f.state) query = query.eq('home_state', f.state)
  if (f.tier) query = query.eq('college_tier', f.tier)
  if (f.firstGen) query = query.eq('first_gen_graduate', true)
  if (f.minPrice !== undefined) query = query.gte('price_1on1', f.minPrice)
  if (f.maxPrice !== undefined) query = query.lte('price_1on1', f.maxPrice)

  switch (f.sort) {
    case 'rating':     query = query.order('rating_avg', { ascending: false }); break
    case 'price_low':  query = query.order('price_1on1', { ascending: true }); break
    case 'price_high': query = query.order('price_1on1', { ascending: false }); break
    default:
      // "Recommended" leads with proven mentors rather than the cheapest.
      query = query
        .order('rating_avg', { ascending: false })
        .order('sessions_completed', { ascending: false })
  }

  const { data, count, error } = await query.range(from, from + perPage - 1)
  if (error) throw error

  return {
    mentors: (data ?? []).map(toMentor),
    total: count ?? 0,
    page,
    perPage,
    pageCount: Math.max(1, Math.ceil((count ?? 0) / perPage)),
  }
}

/** The featured strip on the landing page. */
export async function featuredMentors(limit = 3) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('mentor_directory')
    .select('*')
    .order('rating_avg', { ascending: false })
    .order('sessions_completed', { ascending: false })
    .limit(limit)
  return (data ?? []).map(toMentor)
}

/** P3 — a single mentor, with the fields the directory view leaves out. */
export async function getMentor(id: string): Promise<MentorDetail | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('mentor_profiles')
    .select('*, profiles!inner(name, avatar_url, status)')
    .eq('user_id', id)
    .eq('status', 'approved')
    .maybeSingle()

  if (!data) return null
  const p = (data as any).profiles
  if (p?.status !== 'active') return null

  return {
    ...toMentor({ ...data, id: data.user_id, name: p.name, avatar_url: p.avatar_url }),
    story: data.story ?? undefined,
    currentPosition: data.current_position ?? undefined,
    linkedinUrl: data.linkedin_url,
  }
}

export async function getMentorReviews(mentorId: string, limit = 10) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('reviews')
    .select('id, rating, comment, created_at, profiles!reviews_student_id_fkey(name, college, avatar_url)')
    .eq('mentor_id', mentorId)
    .not('comment', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data ?? []).map((r: any) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment as string,
    createdAt: r.created_at as string,
    studentName: r.profiles?.name ?? 'A student',
    studentCollege: r.profiles?.college ?? undefined,
    studentAvatarUrl: r.profiles?.avatar_url ?? undefined,
  }))
}

/** The filter dropdowns, built from what mentors actually exist. An empty
 *  directory should not offer twenty states with no one behind them. */
export async function mentorFilterOptions() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('mentor_directory')
    .select('languages, home_state, topics, price_1on1')

  const languages = new Set<string>()
  const states = new Set<string>()
  const topics = new Set<string>()
  let minPrice = Infinity
  let maxPrice = 0

  for (const row of data ?? []) {
    ;(row.languages ?? []).forEach((l: string) => languages.add(l))
    if (row.home_state) states.add(row.home_state)
    ;(row.topics ?? []).forEach((t: string) => topics.add(t))
    minPrice = Math.min(minPrice, row.price_1on1)
    maxPrice = Math.max(maxPrice, row.price_1on1)
  }

  return {
    languages: [...languages].sort(),
    states: [...states].sort(),
    topics: [...topics].sort(),
    minPrice: Number.isFinite(minPrice) ? minPrice : 99,
    maxPrice: maxPrice || 499,
  }
}
