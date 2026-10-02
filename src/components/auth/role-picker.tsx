'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { GraduationCap, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Which door you came in by. It only changes where you land after sign-up —
 * a mentor goes to the application, a student to the matching quiz — and
 * `role` itself is set server-side, never from this control.
 */
export function RolePicker({ role }: { role: 'student' | 'mentor' }) {
  const router = useRouter()
  const params = useSearchParams()

  const pick = (next: 'student' | 'mentor') => {
    const q = new URLSearchParams(params.toString())
    if (next === 'mentor') q.set('role', 'mentor')
    else q.delete('role')
    router.replace(`?${q}`, { scroll: false })
  }

  const options = [
    {
      value: 'student' as const,
      icon: GraduationCap,
      title: 'I am a student',
      hint: 'Book ₹99 rooms and 1:1 calls',
    },
    {
      value: 'mentor' as const,
      icon: Users,
      title: 'I want to mentor',
      hint: 'Share what you already figured out',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Who are you?">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={role === o.value}
          onClick={() => pick(o.value)}
          className={cn(
            'rounded-[var(--radius-md)] border p-3 text-left transition-colors',
            role === o.value
              ? 'border-primary bg-primary-soft'
              : 'border-border hover:bg-surface-muted'
          )}
        >
          <o.icon
            className={cn('size-4', role === o.value ? 'text-primary' : 'text-subtle-foreground')}
            aria-hidden
          />
          <span className="mt-1.5 block text-[0.8125rem] font-bold leading-tight">{o.title}</span>
          <span className="mt-0.5 block text-[0.6875rem] leading-snug text-muted-foreground">
            {o.hint}
          </span>
        </button>
      ))}
    </div>
  )
}
