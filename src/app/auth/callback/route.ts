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

  // Straight through: there is no age gate to satisfy any more, so a Google
  // sign-in lands where it was headed.
  return NextResponse.redirect(`${origin}${safeNext}`)
}
