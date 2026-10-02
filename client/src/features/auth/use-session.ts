import { useMemo } from 'react'

export type SessionUser = {
  id: string
  name: string
  avatarUrl?: string
  role: 'student' | 'mentor' | 'admin'
  /** Shown under the name in the navbar, e.g. "Tier-3 College". */
  subtitle?: string
  creditsBalance: number
  unreadNotifications: number
}

/**
 * TEMPORARY. Replaced by the real auth feature in Week 1 (A1–A4).
 * Set VITE_MOCK_SESSION=true in client/.env.local to preview the signed-in
 * navbar against the approved designs.
 */
export function useSession(): { user: SessionUser | null; isLoading: boolean } {
  const mock = import.meta.env.VITE_MOCK_SESSION === 'true'
  return useMemo(
    () => ({
      isLoading: false,
      user: mock
        ? {
            id: 'demo',
            name: 'Rohan S.',
            role: 'student',
            subtitle: 'Tier-3 College',
            creditsBalance: 198,
            unreadNotifications: 2,
          }
        : null,
    }),
    [mock]
  )
}
