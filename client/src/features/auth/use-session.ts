import { useAuth } from './auth-context'

export type SessionUser = {
  id: string
  name: string
  avatarUrl?: string
  role: 'student' | 'mentor' | 'admin'
  subtitle?: string
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
 * Navbar view of the signed-in user. Credits and notification counts are
 * placeholders until CreditLedger and Notification have endpoints (Week 3/4).
 */
export function useSession(): { user: SessionUser | null; isLoading: boolean } {
  const { user, isLoading } = useAuth()
  if (!user) return { user: null, isLoading }
  return {
    isLoading,
    user: {
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      subtitle: user.collegeTier ? TIER_LABEL[user.collegeTier] : undefined,
      creditsBalance: 0,
      unreadNotifications: 0,
    },
  }
}
