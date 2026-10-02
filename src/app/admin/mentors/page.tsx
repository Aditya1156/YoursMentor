import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { UserCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { EmptyState, ErrorState } from '@/components/shared/states'
import { ApplicationCard } from '@/components/admin/application-card'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/session'

export const metadata: Metadata = { title: 'Mentor approvals', robots: { index: false } }
export const dynamic = 'force-dynamic'

const TABS = ['pending', 'approved', 'rejected', 'suspended'] as const

/** AD2 — Mentor approvals. The gate everything else waits on. */
export default async function AdminMentorsPage({
  searchParams,
}: { searchParams: Promise<{ status?: string }> }) {
  const user = await getSessionUser()
  if (!user) redirect('/signin?next=/admin/mentors')
  if (user.role !== 'admin') redirect('/')

  const { status: raw } = await searchParams
  const status = (TABS as readonly string[]).includes(raw ?? '') ? raw! : 'pending'

  const supabase = await createClient()
  const [listed, counted] = await Promise.all([
    supabase
      .from('mentor_profiles')
      .select('*, profiles!inner(name, email:id, avatar_url, college, home_state)')
      .eq('status', status)
      .order('created_at', { ascending: true }),
    supabase.from('mentor_profiles').select('status'),
  ])

  const counts = Object.fromEntries(
    TABS.map((t) => [t, (counted.data ?? []).filter((r) => r.status === t).length])
  )

  return (
    <div className="container-page flex flex-col gap-5 py-8 md:py-10">
      <div>
        <h1 className="text-2xl">Mentor approvals</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Check the LinkedIn profile and the uploaded ID against the claimed role. The
          verified badge is only worth something if this step is real.
        </p>
      </div>

      <nav className="flex flex-wrap gap-1 rounded-[var(--radius-pill)] bg-surface-muted p-1">
        {TABS.map((t) => (
          <a
            key={t}
            href={`/admin/mentors?status=${t}`}
            aria-current={t === status ? 'page' : undefined}
            className={`flex items-center gap-1.5 rounded-[var(--radius-pill)] px-3.5 py-2 text-sm font-semibold capitalize transition-colors ${
              t === status ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
            {counts[t] > 0 && (
              <Badge tone={t === status ? 'neutral' : 'indigo'}>{counts[t]}</Badge>
            )}
          </a>
        ))}
      </nav>

      {listed.error ? (
        <ErrorState description="Could not load applications." />
      ) : (listed.data ?? []).length === 0 ? (
        <EmptyState
          icon={<UserCheck aria-hidden />}
          title={status === 'pending' ? 'No applications waiting' : `Nothing ${status}`}
          description={
            status === 'pending'
              ? 'New applications land here the moment someone submits one.'
              : undefined
          }
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(listed.data as any[]).map((row) => (
            <li key={row.user_id}>
              <ApplicationCard application={row} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
