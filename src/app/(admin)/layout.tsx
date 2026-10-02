import { redirect } from 'next/navigation'
import { AdminNav } from '@/components/admin/admin-nav'
import { getSessionUser } from '@/lib/session'

/**
 * One guard for the whole panel. Putting it in the layout means a new admin
 * page cannot forget it — the alternative is remembering a check in every
 * page, and eventually someone does not.
 *
 * This is defence in depth, not the real gate: every admin write goes through
 * an API route that re-checks the role server-side, and the tables themselves
 * are closed to clients by RLS.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/signin?next=/admin')
  if (user.role !== 'admin') redirect('/')

  return (
    <div className="container-page py-6 md:py-8">
      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        <AdminNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
