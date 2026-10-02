import { redirect } from 'next/navigation'
import { MentorNav } from '@/components/mentor/mentor-nav'
import { getSessionUser } from '@/lib/session'
import { myMentorApplication } from '@/lib/queries/mentor'

/**
 * One guard for every mentor screen. Being role `mentor` is not enough — an
 * applicant has that role the moment they apply. These pages need an
 * *approved* profile, which is the same thing the directory and RLS check.
 */
export default async function MentorLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/signin?next=/mentor')

  const application = await myMentorApplication().catch(() => null)
  if (!application) redirect('/apply-to-mentor')
  if (application.status !== 'approved') redirect('/apply-to-mentor')

  return (
    <div className="container-page py-6 md:py-8">
      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        <MentorNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
