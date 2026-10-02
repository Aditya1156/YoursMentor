import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Turns the calling admin into a host — an approved mentor profile of their
 * own, so they can run sessions like anyone else.
 *
 * The role check happens inside ensure_host_profile(), which reads it from the
 * database rather than trusting anything in the request. This route only
 * forwards the caller's session.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  let headline: string | undefined
  let price: number | undefined
  try {
    const body = await request.json()
    headline = typeof body?.headline === 'string' ? body.headline : undefined
    price = Number.isFinite(Number(body?.price)) ? Number(body.price) : undefined
  } catch {
    /* both are optional */
  }

  const { data, error } = await supabase.rpc('ensure_host_profile', {
    p_headline: headline ?? null,
    p_price: price ?? 199,
  })

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message.includes('Admins only') ? 403 : 400 }
    )
  }
  return NextResponse.json({ hostId: data })
}
