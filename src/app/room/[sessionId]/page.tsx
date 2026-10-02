import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { SessionRoom } from '@/components/room/session-room'
import { getSessionUser } from '@/lib/session'

export const metadata: Metadata = { title: 'Session room', robots: { index: false } }
export const dynamic = 'force-dynamic'

/** S6 — Session room. Access is decided by the token route, not here. */
export default async function RoomPage({
  params,
}: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  const user = await getSessionUser()
  if (!user) redirect(`/signin?next=${encodeURIComponent(`/room/${sessionId}`)}`)

  return <SessionRoom sessionId={sessionId} displayName={user.name} />
}
