import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { SessionRoom } from '@/components/room/session-room'
import { getSessionUser } from '@/lib/session'

export const metadata: Metadata = { title: 'Session room', robots: { index: false } }
export const dynamic = 'force-dynamic'

/** S6 — Session room. Access is decided by the token route, not here. */
export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>
  searchParams: Promise<{ device?: string }>
}) {
  const { sessionId } = await params
  const { device } = await searchParams
  const user = await getSessionUser()
  if (!user) {
    const next = `/room/${sessionId}${device === 'companion' ? '?device=companion' : ''}`
    redirect(`/signin?next=${encodeURIComponent(next)}`)
  }

  return (
    <SessionRoom
      sessionId={sessionId}
      displayName={user.name}
      device={device === 'companion' ? 'companion' : 'primary'}
    />
  )
}
