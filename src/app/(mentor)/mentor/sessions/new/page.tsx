import type { Metadata } from 'next'
import { SessionForm } from '@/components/mentor/session-form'
import { myMentorApplication } from '@/lib/queries/mentor'

export const metadata: Metadata = { title: 'Create a session' }

/** M4 — Create a group session. */
export default async function NewSessionPage() {
  const profile = await myMentorApplication().catch(() => null)
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl">Create a ₹99 room</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        A live room for up to 15 students. Give it a title a student would
        actually click, and say what they walk away with.
      </p>
      <div className="mt-6">
        <SessionForm tracks={profile?.tracks ?? []} topics={profile?.topics ?? []} />
      </div>
    </div>
  )
}
