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
 * The signed-in user for server components. Credits and notification counts
 * are zero until CreditLedger and Notification exist (Week 3/4).
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

  return {
    id: user.id,
    name: profile.name,
    avatarUrl: profile.avatar_url ?? undefined,
    role: profile.role,
    subtitle: profile.college_tier ? TIER_LABEL[profile.college_tier] : undefined,
    isAdultConfirmed: profile.is_adult_confirmed,
    onboardingComplete: profile.onboarding_complete,
    creditsBalance: 0,
    unreadNotifications: 0,
  }
}

/** Where a user lands after signing in (spec §8 A1/A2). */
export function homeFor(user: Pick<SessionUser, 'role' | 'isAdultConfirmed' | 'onboardingComplete'>) {
  if (!user.isAdultConfirmed) return '/complete-profile'
  if (user.role === 'admin') return '/admin'
  if (user.role === 'mentor') return '/mentor'
  return user.onboardingComplete ? '/dashboard' : '/onboarding'
}
