'use client'

import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import { Video } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * The join window the database also enforces: 10 minutes before the start,
 * until the end. Re-evaluated every 30 seconds so the button opens by itself
 * while the student is sitting on the page waiting.
 */
function subscribe(onChange: () => void) {
  const t = setInterval(onChange, 30_000)
  return () => clearInterval(t)
}

export function JoinButton({
  sessionId, startAt, endAt,
}: { sessionId: string; startAt: string; endAt: string }) {
  const state = useSyncExternalStore(
    subscribe,
    () => windowState(startAt, endAt, Date.now()),
    () => windowState(startAt, endAt, Date.now())
  )

  if (state === 'over') return null

  if (state === 'early') {
    return (
      <Button variant="outline" size="sm" disabled>
        <Video aria-hidden /> Opens 10 min before
      </Button>
    )
  }

  return (
    <Button variant="primary" size="sm" asChild>
      <Link href={`/room/${sessionId}`}>
        <Video aria-hidden /> Join now
      </Link>
    </Button>
  )
}

function windowState(startAt: string, endAt: string, now: number) {
  const start = new Date(startAt).getTime()
  const end = new Date(endAt).getTime()
  if (now > end) return 'over'
  if (now < start - 10 * 60_000) return 'early'
  return 'open'
}
