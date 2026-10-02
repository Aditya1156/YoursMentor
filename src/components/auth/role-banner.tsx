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
    <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border bg-surface-muted px-3.5 py-3">
      <span className="flex items-center gap-2.5">
        <span
          className={`flex size-8 items-center justify-center rounded-[var(--radius-sm)] ${
            mentor ? 'bg-[var(--navy-800)] text-white' : 'bg-primary text-primary-foreground'
          }`}
        >
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="text-sm">
          <span className="block font-bold leading-tight">
            {mentor ? 'Applying to mentor' : 'Signing up as a student'}
          </span>
          <span className="block text-xs text-muted-foreground">
            {mentor ? 'Application comes after this' : 'Matching quiz comes after this'}
          </span>
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
