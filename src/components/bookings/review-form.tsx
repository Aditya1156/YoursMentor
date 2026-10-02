'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorBanner } from '@/components/auth/error-banner'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const LABEL: Record<number, string> = {
  1: 'Not worth it',
  2: 'Below what I hoped',
  3: 'Useful',
  4: 'Really useful',
  5: 'Changed what I do next',
}

/**
 * Rating a session you attended.
 *
 * The stars carry words, because a bare 1–5 means different things to different
 * people and the number here decides where a mentor appears in the directory.
 * "Changed what I do next" is the bar for five, and saying so keeps the scale
 * from drifting to all-fives the way unlabelled ratings do.
 *
 * The comment is optional and that is deliberate: asking for writing as a
 * condition of rating is how you end up with no ratings. One line of someone
 * else's experience is worth more on a mentor card than a number, so it is
 * invited rather than required.
 */
export function ReviewForm({
  bookingId, mentorName,
}: {
  bookingId: string
  mentorName: string
}) {
  const router = useRouter()
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!rating) return
    setBusy(true)
    setError(null)
    const { error: rpcError } = await createClient().rpc('leave_review', {
      p_booking: bookingId,
      p_rating: rating,
      p_comment: comment.trim() || null,
    })
    setBusy(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    router.push('/my-sessions?tab=past')
    router.refresh()
  }

  const shown = hover || rating

  return (
    <div className="flex flex-col gap-5">
      {error && <ErrorBanner>{error}</ErrorBanner>}

      <div>
        <p className="text-sm font-semibold">
          How was your session with {mentorName.split(' ')[0]}?
        </p>
        <div
          className="mt-2 flex items-center gap-1"
          onMouseLeave={() => setHover(0)}
          role="radiogroup"
          aria-label="Rating out of 5"
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} — ${LABEL[n]}`}
              onMouseEnter={() => setHover(n)}
              onFocus={() => setHover(n)}
              onClick={() => setRating(n)}
              className="rounded-[var(--radius-sm)] p-1 transition-transform hover:scale-110"
            >
              <Star
                className={cn(
                  'size-8',
                  n <= shown
                    ? 'fill-[var(--amber-400)] text-[var(--amber-400)]'
                    : 'text-border'
                )}
                aria-hidden
              />
            </button>
          ))}
        </div>
        <p className="mt-1.5 min-h-5 text-sm font-semibold text-primary">
          {shown ? LABEL[shown] : ''}
        </p>
      </div>

      <div>
        <label htmlFor="comment" className="text-sm font-semibold">
          What should the next student know?{' '}
          <span className="font-normal text-subtle-foreground">(optional)</span>
        </label>
        <textarea
          id="comment"
          rows={4}
          maxLength={1000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What you actually came away with — a change you made, something that clicked, advice that was wrong for you."
          className="mt-1.5 w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2.5 text-sm leading-relaxed"
        />
        <p className="mt-1 text-xs text-subtle-foreground">
          Shown on {mentorName.split(' ')[0]}&rsquo;s card under your first name.{' '}
          {1000 - comment.length} characters left.
        </p>
      </div>

      <Button full size="lg" disabled={!rating || busy} onClick={() => void submit()}>
        {busy && <Loader2 className="animate-spin" aria-hidden />}
        {rating ? 'Post review' : 'Pick a rating first'}
      </Button>
    </div>
  )
}
