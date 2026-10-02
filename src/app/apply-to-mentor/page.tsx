import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Clock, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MentorApplicationForm } from '@/components/mentor/application-form'
import { myMentorApplication, EMPTY_APPLICATION } from '@/lib/queries/mentor'
import { getSessionUser } from '@/lib/session'

export const metadata: Metadata = { title: 'Mentor application' }
export const dynamic = 'force-dynamic'

/** M1 — Mentor application. */
export default async function MentorApplyPage() {
  const user = await getSessionUser()
  if (!user) redirect('/signin?next=/apply-to-mentor')

  const application = await myMentorApplication().catch(() => null)

  if (application?.status === 'approved') redirect('/mentor')

  if (application?.status === 'pending') {
    return (
      <div className="container-page max-w-xl py-12 md:py-16">
        <Card className="p-6 text-center sm:p-8">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent-soft">
            <Clock className="size-6 text-accent-soft-foreground" aria-hidden />
          </span>
          <h1 className="mt-4 text-2xl">Under review</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            A person on our team reads every application against your LinkedIn and your
            workplace ID. We usually come back within 48 hours, and we email you either way.
          </p>
          <Badge tone="amber" size="md" className="mt-4">Usually within 48 hours</Badge>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button variant="outline" asChild><Link href="/mentors">Browse mentors</Link></Button>
            <Button asChild><Link href="/">Back to home</Link></Button>
          </div>
        </Card>
      </div>
    )
  }

  if (application?.status === 'suspended') {
    return (
      <div className="container-page max-w-xl py-12 md:py-16">
        <Card className="p-6 text-center sm:p-8">
          <XCircle className="mx-auto size-10 text-danger" aria-hidden />
          <h1 className="mt-3 text-xl">Your mentor account is suspended</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Write to support@yoursmentor.in and we will go through it with you.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="container-page max-w-2xl py-8 md:py-12">
      <h1 className="text-2xl sm:text-3xl">Apply to mentor</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        Takes about 10 minutes. We review every application by hand — the verified badge
        has to mean something.
      </p>

      {application?.status === 'rejected' && application.rejectionReason && (
        <Card className="mt-5 border-danger bg-danger-soft p-4">
          <p className="text-sm font-bold text-danger">We could not approve this last time</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {application.rejectionReason}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Fix it below and send it again — reapplying is fine.
          </p>
        </Card>
      )}

      <div className="mt-6">
        <MentorApplicationForm
          initial={application ?? EMPTY_APPLICATION}
          name={user?.name ?? 'You'}
          avatarUrl={user?.avatarUrl}
        />
      </div>
    </div>
  )
}
