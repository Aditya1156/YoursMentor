import { LandingSections } from '@/components/landing/landing-sections'
import { featuredMentors } from '@/lib/queries/mentors'
import { listGroupSessions } from '@/lib/queries/sessions'

/** P1 — Landing. */
export const revalidate = 300

export default async function HomePage() {
  // An empty database is the expected state at launch, not an error, so each
  // of these degrades to its own empty state rather than failing the page.
  const [mentors, sessions] = await Promise.all([
    featuredMentors(3).catch(() => []),
    listGroupSessions({ limit: 3 }).catch(() => []),
  ])
  return <LandingSections mentors={mentors} sessions={sessions} />
}
