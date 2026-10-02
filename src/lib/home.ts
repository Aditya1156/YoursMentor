/**
 * Where a signed-in person belongs.
 *
 * Pure and dependency-free so the middleware (edge runtime) and the server
 * components can both use it. Having two copies of this rule is how you end up
 * with a mentor being sent to a student dashboard, which is what used to happen
 * when the middleware hardcoded /dashboard after sign-in.
 */
export interface HomeFacts {
  role: 'student' | 'mentor' | 'admin'
  isAdultConfirmed: boolean
  onboardingComplete: boolean
}

export function homeFor(user: HomeFacts): string {
  // The 18+ gate comes first: a Google sign-in arrives with no date of birth,
  // and nothing else should happen until it has one.
  if (!user.isAdultConfirmed) return '/complete-profile'
  if (user.role === 'admin') return '/admin'
  if (user.role === 'mentor') return '/mentor'
  return user.onboardingComplete ? '/dashboard' : '/onboarding'
}
