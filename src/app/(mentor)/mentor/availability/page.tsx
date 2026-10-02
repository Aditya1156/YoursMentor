import type { Metadata } from 'next'
import { AvailabilityEditor } from '@/components/mentor/availability-editor'
import { mentorAvailability } from '@/lib/queries/mentor-dashboard'

export const metadata: Metadata = { title: 'Availability' }
export const dynamic = 'force-dynamic'

/** M3 — Weekly availability and blocked dates. */
export default async function AvailabilityPage() {
  const { rules, blocked } = await mentorAvailability().catch(() => ({ rules: [], blocked: [] }))

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl">Availability</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        The hours you are open for 1:1 calls each week. Slots are generated from
        this — 30 minutes each, never less than 12 hours out, and never clashing
        with a room you are already running.
      </p>
      <div className="mt-6">
        <AvailabilityEditor initialRules={rules} initialBlocked={blocked} />
      </div>
    </div>
  )
}
