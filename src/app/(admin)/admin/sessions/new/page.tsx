import type { Metadata } from 'next'
import { AdminSessionForm } from '@/components/admin/admin-session-form'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Create a session', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function AdminNewSessionPage() {
  const supabase = await createClient()
  const { data } = await supabase.rpc('hostable_mentors')

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const hosts = ((data ?? []) as any[]).map((h) => ({
    id: h.user_id as string,
    name: h.name as string,
    headline: h.headline as string,
    isSelf: !!h.is_self,
  }))

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl">Create a session</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        Run a class yourself, or schedule one on a mentor&rsquo;s behalf. It appears in
        the public list straight away.
      </p>
      <div className="mt-6">
        <AdminSessionForm hosts={hosts} />
      </div>
    </div>
  )
}
