'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorBanner } from '@/components/auth/error-banner'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

/**
 * Reasons, written as the thing that happened rather than as policy language.
 * Someone filling this in has just had an unpleasant few minutes and should not
 * have to translate it into our categories.
 */
const REASONS = [
  { id: 'asked_for_money', label: 'Asked me for money outside the platform' },
  { id: 'asked_to_move_off', label: 'Pushed me to WhatsApp, Telegram or a personal number' },
  { id: 'inappropriate', label: 'Said or showed something inappropriate' },
  { id: 'harassment', label: 'Harassment, threats or discrimination' },
  { id: 'no_show', label: 'Did not turn up, or left almost immediately' },
  { id: 'misleading', label: 'Their company, college or experience looked untrue' },
  { id: 'not_useful', label: 'The session was nothing like what was promised' },
  { id: 'other', label: 'Something else' },
] as const

export function ReportForm({
  targetType, targetId, contextLabel,
}: {
  targetType: 'user' | 'session' | 'message'
  targetId: string
  contextLabel: string | null
}) {
  const router = useRouter()
  const [reason, setReason] = useState<string | null>(null)
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function submit() {
    if (!reason) return
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setBusy(false)
      setError('Please sign in again.')
      return
    }
    // The insert policy requires reporter_id = auth.uid(), so a report cannot be
    // filed in somebody else's name.
    const { error: insertError } = await supabase.from('reports').insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason: REASONS.find((r) => r.id === reason)?.label ?? reason,
      details: details.trim() || null,
    })
    setBusy(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setDone(true)
    router.refresh()
  }

  if (done) {
    return (
      <div className="text-center">
        <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-success-soft">
          <CheckCircle2 className="size-5 text-success" aria-hidden />
        </span>
        <h2 className="mt-3 text-lg">Thank you — this is with us</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          An admin reads every report. We will not tell the other person who filed
          it. If you paid for this session and it was not delivered, reply to the
          confirmation email and we will refund you in credits.
        </p>
        <Button variant="outline" className="mt-5" onClick={() => router.push('/my-sessions')}>
          Back to my sessions
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {error && <ErrorBanner>{error}</ErrorBanner>}

      {contextLabel && (
        <p className="rounded-[var(--radius-md)] border border-border bg-surface-muted px-3 py-2 text-xs text-muted-foreground">
          About: <span className="font-semibold text-foreground">{contextLabel}</span>
        </p>
      )}

      <fieldset>
        <legend className="text-sm font-semibold">What happened?</legend>
        <div className="mt-2 flex flex-col gap-1.5">
          {REASONS.map((r) => (
            <label
              key={r.id}
              className={cn(
                'flex cursor-pointer items-start gap-2.5 rounded-[var(--radius-md)] border p-3 text-sm transition-colors',
                reason === r.id
                  ? 'border-primary bg-primary-soft font-semibold'
                  : 'border-border hover:bg-surface-muted'
              )}
            >
              <input
                type="radio"
                name="reason"
                checked={reason === r.id}
                onChange={() => setReason(r.id)}
                className="mt-0.5 size-4 accent-[var(--primary)]"
              />
              <span className="leading-snug">{r.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="details" className="text-sm font-semibold">
          Anything else we should know?{' '}
          <span className="font-normal text-subtle-foreground">(optional)</span>
        </label>
        <textarea
          id="details"
          rows={4}
          maxLength={2000}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="What was said or done, and roughly when."
          className="mt-1.5 w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2.5 text-sm leading-relaxed"
        />
      </div>

      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <ShieldAlert className="mt-px size-4 shrink-0 text-amber-600" aria-hidden />
        If you are in immediate danger, contact the police on 112. We can suspend an
        account; we cannot respond to an emergency.
      </p>

      <Button full size="lg" variant="danger" disabled={!reason || busy} onClick={() => void submit()}>
        {busy && <Loader2 className="animate-spin" aria-hidden />}
        Send report
      </Button>
    </div>
  )
}
