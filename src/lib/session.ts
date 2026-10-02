import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export interface SessionUser {
  id: string
  name: string
  avatarUrl?: string
  role: 'student' | 'mentor' | 'admin'
  /** Shown under the name in the navbar, e.g. "Tier-3 College". */
  subtitle?: string
  isAdultConfirmed: boolean
  onboardingComplete: boolean
  creditsBalance: number
  unreadNotifications: number
}

const TIER_LABEL: Record<string, string> = {
  tier1: 'Tier-1 College',
  tier2: 'Tier-2 College',
  tier3: 'Tier-3 College',
  other: 'College',
}

/**
 * The signed-in user for server components.
 *
 * Credits are a student's refund wallet, so they are only read for students —
 * a mentor's money lives in mentor_earnings() and means something different.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient()

  // getUser() revalidates with Supabase; getSession() trusts the cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, avatar_url, role, college_tier, is_adult_confirmed, onboarding_complete')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  const isStudent = profile.role === 'student'

  const [credits, unread] = await Promise.all([
    isStudent
      ? supabase.rpc('credit_balance', { p_user: user.id })
      : Promise.resolve({ data: 0 }),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false),
  ])

  return {
    id: user.id,
    name: profile.name,
    avatarUrl: profile.avatar_url ?? undefined,
    role: profile.role,
    subtitle:
      profile.role === 'admin'
        ? 'Admin'
        : profile.role === 'mentor'
          ? 'Mentor'
          : profile.college_tier
            ? TIER_LABEL[profile.college_tier]
            : undefined,
    isAdultConfirmed: profile.is_adult_confirmed,
    onboardingComplete: profile.onboarding_complete,
    creditsBalance: typeof credits.data === 'number' ? credits.data : 0,
    unreadNotifications: unread.count ?? 0,
  }
}

/** Where a user lands after signing in (spec §8 A1/A2). */
export function homeFor(user: Pick<SessionUser, 'role' | 'isAdultConfirmed' | 'onboardingComplete'>) {
  if (!user.isAdultConfirmed) return '/complete-profile'
  if (user.role === 'admin') return '/admin'
  if (user.role === 'mentor') return '/mentor'
  return user.onboardingComplete ? '/dashboard' : '/onboarding'
}

/**
 * Guards a student-only page.
 *
 * A mentor or admin who lands on /dashboard is lost, not attacking — they
 * followed a link that should not have been shown to them — so they are sent
 * to their own home rather than shown an error. RLS is still what protects the
 * data; this only keeps the product coherent.
 */
export async function requireStudent(next: string): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) redirect(`/signin?next=${encodeURIComponent(next)}`)
  if (user.role !== 'student') redirect(homeFor(user))
  return user
}
