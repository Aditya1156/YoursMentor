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
  onboardingComplete: boolean
}

export function homeFor(user: HomeFacts): string {
  if (user.role === 'admin') return '/admin'
  if (user.role === 'mentor') return '/mentor'
  return user.onboardingComplete ? '/dashboard' : '/onboarding'
}
