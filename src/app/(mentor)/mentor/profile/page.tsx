import type { Metadata } from 'next'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { MentorApplicationForm } from '@/components/mentor/application-form'
import { myMentorApplication, EMPTY_APPLICATION } from '@/lib/queries/mentor'
import { getSessionUser } from '@/lib/session'

export const metadata: Metadata = { title: 'Public profile' }
export const dynamic = 'force-dynamic'

/** M7 — Edit the public profile. Same form as the application. */
export default async function MentorProfilePage() {
  const [profile, user] = await Promise.all([
    myMentorApplication().catch(() => null),
    getSessionUser(),
  ])

  return (
    <div className="max-w-2xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl">Public profile</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            What students see before they book you. Changes go live immediately.
          </p>
        </div>
        {user && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/mentors/${user.id}`} target="_blank">
              <ExternalLink aria-hidden /> View it live
            </Link>
          </Button>
        )}
      </div>

      <Card className="mt-5 bg-surface-muted p-4">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Your approval status, rating and session count are not editable here — they are
          set by our review team and by what students do. Everything else is yours.
        </p>
      </Card>

      <div className="mt-5">
        <MentorApplicationForm
          initial={profile ?? EMPTY_APPLICATION}
          name={user?.name ?? 'You'}
          avatarUrl={user?.avatarUrl}
        />
      </div>
    </div>
  )
}
