import { NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'
import { createClient } from '@/lib/supabase/server'

/**
 * Mints a LiveKit join token.
 *
 * Spec §7: a token is issued only to the session's mentor or a student with a
 * confirmed booking, and only inside the join window. The checks run here
 * because the API secret lives here — the browser is never trusted to decide
 * whether it may join a paid room.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params

  // A companion is a second device the same person is already signed in on —
  // a tablet used as a writing surface beside the laptop running the call.
  let device: 'primary' | 'companion' = 'primary'
  try {
    const body = await request.json()
    if (body?.device === 'companion') device = 'companion'
  } catch {
    /* no body is the normal case */
  }

  const { LIVEKIT_API_KEY, LIVEKIT_API_SECRET } = process.env
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    return NextResponse.json({ error: 'Video is not configured yet.' }, { status: 503 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  const { data: session } = await supabase
    .from('sessions')
    .select('id, mentor_id, title, start_at, end_at, status, fallback_meet_url')
    .eq('id', sessionId)
    .maybeSingle()

  if (!session) return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
  if (session.status === 'cancelled') {
    return NextResponse.json({ error: 'That session was cancelled.' }, { status: 410 })
  }

  const isMentor = session.mentor_id === user.id
  if (!isMentor) {
    const { data: booking } = await supabase
      .from('bookings')
      .select('id')
      .eq('session_id', sessionId)
      .eq('student_id', user.id)
      .in('status', ['confirmed', 'attended'])
      .maybeSingle()

    if (!booking) {
      return NextResponse.json(
        { error: 'You need a confirmed seat to join this session.' },
        { status: 403 }
      )
    }
  }

  // The join window, matching what the UI shows: 10 minutes before, until the end.
  const now = Date.now()
  const start = new Date(session.start_at).getTime()
  const end = new Date(session.end_at).getTime()
  if (now < start - 10 * 60_000) {
    return NextResponse.json(
      { error: 'The room opens 10 minutes before the start time.' },
      { status: 425 }
    )
  }
  if (now > end + 15 * 60_000) {
    return NextResponse.json({ error: 'That session has ended.' }, { status: 410 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, avatar_url')
    .eq('id', user.id)
    .single()

  const room = `session_${sessionId}`
  // Outlives the session by 15 minutes so a reconnect near the end still works.
  const ttl = Math.max(600, Math.floor((end - now) / 1000) + 900)

  /**
   * LiveKit identities must be unique within a room — joining twice with the
   * same one disconnects the earlier connection. Keying identity on the user
   * id alone meant signing in from a tablet would kick the laptop running the
   * call, which is the opposite of what a companion device is for.
   *
   * The user id stays in metadata, so the UI can still group a person's
   * devices and the mentor sees one name rather than two strangers.
   */
  const identity = `${user.id}#${device}#${crypto.randomUUID().slice(0, 8)}`

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity,
    name: profile?.name ?? 'Student',
    metadata: JSON.stringify({
      userId: user.id,
      role: isMentor ? 'mentor' : 'student',
      device,
      avatarUrl: profile?.avatar_url,
    }),
    ttl,
  })

  at.addGrant({
    room,
    roomJoin: true,
    // A companion publishes nothing but data. Two cameras and two microphones
    // from one person would echo and take a tile each; the tablet is there to
    // draw, not to be a second face in the grid.
    canPublish: device === 'primary',
    canSubscribe: true,
    canPublishData: true,
    // Only the mentor may mute or remove people (spec §7).
    roomAdmin: isMentor && device === 'primary',
  })

  return NextResponse.json({
    token: await at.toJwt(),
    url: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    room,
    device,
    role: isMentor ? 'mentor' : 'student',
    title: session.title,
    endsAt: session.end_at,
    fallbackMeetUrl: session.fallback_meet_url ?? null,
  })
}
