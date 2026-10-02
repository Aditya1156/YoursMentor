'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function GoogleButton({ next, role }: { next?: string; role?: 'student' | 'mentor' }) {
  const [loading, setLoading] = useState(false)

  async function signIn() {
    setLoading(true)
    const params = new URLSearchParams()
    if (next) params.set('next', next)
    if (role) params.set('role', role)

    const { error } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback${params.size ? `?${params}` : ''}`,
      },
    })
    if (error) setLoading(false)
  }

  return (
    <button
      type="button"
      onClick={() => void signIn()}
      disabled={loading}
      className="flex h-11 w-full items-center justify-center gap-2.5 rounded-[var(--radius-sm)] border border-border bg-surface text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z" />
          <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z" />
          <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1z" />
          <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
        </svg>
      )}
      Continue with Google
    </button>
  )
}
