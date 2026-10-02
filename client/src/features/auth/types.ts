export interface AuthUser {
  id: string
  name: string
  email: string
  avatarUrl?: string
  role: 'student' | 'mentor' | 'admin'
  emailVerified: boolean
  isAdultConfirmed: boolean
  onboardingComplete: boolean
  status: 'active' | 'suspended'
  college?: string
  collegeTier?: 'tier1' | 'tier2' | 'tier3' | 'other'
  homeState?: string
  languages: string[]
  firstGenGraduate?: boolean
  goals: string[]
}

export interface SessionResponse {
  accessToken: string
  user: AuthUser
  message?: string
}

/** Where a user lands after signing in (spec §8 A1/A2). */
export function homeFor(user: AuthUser): string {
  if (!user.isAdultConfirmed) return '/complete-signup'
  if (user.role === 'admin') return '/admin'
  if (user.role === 'mentor') return '/mentor'
  return user.onboardingComplete ? '/dashboard' : '/onboarding'
}
