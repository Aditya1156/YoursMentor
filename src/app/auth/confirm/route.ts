import type { EmailOtpType } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_TYPES: EmailOtpType[] = [
  'recovery',
  'signup',
  'invite',
  'magiclink',
  'email_change',
  'email',
]

/**
 * Stateless email-link handler: verifies a one-time `token_hash` and sets the
 * session. Unlike the PKCE `?code=` exchange in /auth/callback this needs
 * nothing stored in the browser, so a link requested on a phone still works
 * when the email is opened on a laptop.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/dashboard'
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'

  if (!tokenHash || !type || !ALLOWED_TYPES.includes(type)) {
    return NextResponse.redirect(`${origin}/signin?error=link`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
  if (error) {
    return NextResponse.redirect(`${origin}/signin?error=link`)
  }

  // Recovery links must land on the password form whatever `next` says.
  const destination = type === 'recovery' ? '/update-password' : safeNext
  return NextResponse.redirect(`${origin}${destination}`)
}
