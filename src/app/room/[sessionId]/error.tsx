'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

/**
 * If anything in the room throws, this is what the person sees.
 *
 * Without a boundary here a crash fell through to Next's default page, which
 * says a client-side exception occurred and offers nothing but a reload — in the
 * middle of a paid session, with the other person waiting. Rejoining is almost
 * always the right next action, so it is the button.
 */
export default function RoomError({
  error, reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Goes to the Vercel function logs, where a real failure can be read back.
    console.error('Session room crashed:', error)
  }, [error])

  return (
    <div className="container-page max-w-lg py-10 md:py-16">
      <Card className="p-6 sm:p-8">
        <span className="flex size-11 items-center justify-center rounded-full bg-danger-soft">
          <AlertCircle className="size-5 text-danger" aria-hidden />
        </span>
        <h1 className="mt-4 text-xl">The room stopped responding</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Your seat is still yours and the session is still running. Rejoining puts you
          back in — the other person will not have been dropped.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={reset}>
            <RotateCcw aria-hidden /> Rejoin
          </Button>
          <Button variant="outline" asChild>
            <Link href="/my-sessions">My sessions</Link>
          </Button>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-subtle-foreground">
          If it keeps happening, your network may be blocking video. Try switching
          from office or college Wi-Fi to mobile data.
        </p>
      </Card>
    </div>
  )
}
