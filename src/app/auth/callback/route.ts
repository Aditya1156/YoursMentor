import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** PKCE handler for Google sign-in. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'

  if (!code) return NextResponse.redirect(`${origin}/signin?error=google`)

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return NextResponse.redirect(`${origin}/signin?error=google`)

  // Google never tells us a date of birth, so the 18+ gate is still open.
  // The proxy routes to /complete-profile when it is.
  return NextResponse.redirect(`${origin}${safeNext}`)
}
