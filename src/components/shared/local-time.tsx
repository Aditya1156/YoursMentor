'use client'

import { useSyncExternalStore } from 'react'
import { formatSessionTime } from '@/lib/utils'

/**
 * Times are stored in UTC and must render in the viewer's own zone — mentors
 * in Germany and Canada make that non-negotiable. The server cannot know that
 * zone, so it renders IST, where almost every student is, and the client
 * swaps in the real one.
 *
 * useSyncExternalStore is the sanctioned way to return a different value on
 * the server and the client: React knows the two are meant to differ and does
 * not treat it as a hydration mismatch, and there is no cascading render.
 */
const subscribe = () => () => {}

export function LocalTime({ iso, className }: { iso: string; className?: string }) {
  const text = useSyncExternalStore(
    subscribe,
    () => formatSessionTime(iso),                 // client: the viewer's zone
    () => formatSessionTime(iso, 'Asia/Kolkata')  // server: IST
  )

  return (
    <time dateTime={iso} className={className}>
      {text}
    </time>
  )
}
