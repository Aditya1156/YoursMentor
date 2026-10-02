import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { ReportForm } from '@/components/shared/report-form'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/session'

export const metadata: Metadata = { title: 'Report a problem', robots: { index: false } }
export const dynamic = 'force-dynamic'

const TYPES = ['user', 'session', 'message'] as const
type Target = (typeof TYPES)[number]

/**
 * Reporting a person or a session.
 *
 * The Report button inside the live room has linked here since the room was
 * built and the page did not exist, so the one safety valve available mid-call
 * went to a 404. The reports table and its policies were already live.
 *
 * Reachable by any signed-in person, not just students: a mentor on the
 * receiving end of something needs this as much as a student does.
 */
export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; id?: string }>
}) {
  const { type, id } = await searchParams
  const user = await getSessionUser()
  if (!user) {
    const q = new URLSearchParams()
    if (type) q.set('type', type)
    if (id) q.set('id', id)
    redirect(`/signin?next=${encodeURIComponent(`/report?${q.toString()}`)}`)
  }

  const targetType: Target = TYPES.includes(type as Target) ? (type as Target) : 'user'
  if (!id) redirect('/my-sessions')

  // Name what is being reported, so nobody files one against the wrong person.
  // Read with the caller's own client: if RLS will not show it to them, they
  // see the id and nothing more rather than a leak.
  const supabase = await createClient()
  let contextLabel: string | null = null

  if (targetType === 'session') {
    const { data } = await supabase
      .from('sessions')
      .select('title, mentor_profiles!inner ( profiles!inner ( name ) )')
      .eq('id', id)
      .maybeSingle()
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const row = data as any
    if (row) {
      contextLabel = `${row.title} — hosted by ${row.mentor_profiles.profiles.name}`
    }
  } else if (targetType === 'user') {
    const { data } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', id)
      .maybeSingle()
    if (data) contextLabel = data.name
  }

  return (
    <div className="container-page max-w-lg py-8 md:py-12">
      <h1 className="text-2xl">Report a problem</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        Tell us what happened. Reports are read by an admin and the person you are
        reporting is never told who filed it.
      </p>
      <Card className="mt-5 p-6 sm:p-7">
        <ReportForm targetType={targetType} targetId={id} contextLabel={contextLabel} />
      </Card>
    </div>
  )
}
