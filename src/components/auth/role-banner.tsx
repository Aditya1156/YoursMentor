import Link from 'next/link'
import { GraduationCap, Users } from 'lucide-react'

/**
 * Confirms which door you came in by, and offers the way back. The choice
 * itself is made on /join — repeating it as a control here would invite
 * someone to change it halfway down a form they have already started.
 */
export function RoleBanner({ role }: { role: 'student' | 'mentor' }) {
  const mentor = role === 'mentor'
  const Icon = mentor ? Users : GraduationCap

  return (
    <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border bg-surface-muted px-3 py-2">
      <span className="flex items-center gap-2">
        <span
          className={`flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] ${
            mentor ? 'bg-[var(--navy-800)] text-white' : 'bg-primary text-primary-foreground'
          }`}
        >
          <Icon className="size-3.5" aria-hidden />
        </span>
        <span className="text-[0.8125rem] font-bold">
          {mentor ? 'Applying to mentor' : 'Signing up as a student'}
        </span>
      </span>
      <Link
        href="/join"
        className="shrink-0 text-xs font-semibold text-primary hover:underline"
      >
        Change
      </Link>
    </div>
  )
}
