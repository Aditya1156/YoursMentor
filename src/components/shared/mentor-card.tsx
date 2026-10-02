import Link from 'next/link'
import { BadgeCheck, Sparkles, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { StarRating } from '@/components/shared/star-rating'
import { MatchReasonChips } from '@/components/shared/match-reasons'
import { TIER_LABEL, type MentorSummary } from '@/lib/types'
import { cn, formatINR } from '@/lib/utils'

/**
 * Shared by the directory, the landing strip and the quiz results. Every
 * mentor reaching this card is `approved`, which means a person checked their
 * LinkedIn and ID — so the verified badge is unconditional rather than a flag.
 *
 * A ₹99 trial renders the amber CTA, a normal 1:1 renders blue. See the brand
 * rule in tokens.css.
 */
export function MentorCard({
  mentor,
  compact = false,
  className,
}: {
  mentor: MentorSummary
  compact?: boolean
  className?: string
}) {
  return (
    <Card interactive className={cn('flex flex-col', className)}>
      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Avatar name={mentor.name} src={mentor.avatarUrl} size={compact ? 'md' : 'lg'} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="flex items-center gap-1 text-[0.9375rem] font-bold leading-tight">
                <Link href={`/mentors/${mentor.id}`} className="hover:text-primary">
                  {mentor.name}
                </Link>
                <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="Verified mentor" />
              </h3>
              {mentor.ratingCount > 0 && (
                <StarRating value={mentor.ratingAvg} count={mentor.ratingCount} />
              )}
            </div>
            <p className="mt-0.5 text-sm font-semibold leading-snug text-primary">
              {mentor.headline}
            </p>
            {mentor.collegeLine && (
              <p className="mt-0.5 text-xs text-muted-foreground">{mentor.collegeLine}</p>
            )}
          </div>
        </div>

        {mentor.matchReasons && <MatchReasonChips reasons={mentor.matchReasons} />}

        <div className="flex flex-wrap gap-1.5">
          {mentor.firstGenGraduate && (
            <Badge tone="amber">
              <Sparkles aria-hidden /> First-Gen Grad
            </Badge>
          )}
          {mentor.collegeTier && (
            <Badge tone="indigo">
              {TIER_LABEL[mentor.collegeTier]}
              {mentor.homeState ? ` · ${mentor.homeState}` : ''}
            </Badge>
          )}
          {mentor.languages.length > 0 && (
            <Badge tone="neutral">{mentor.languages.join(', ')}</Badge>
          )}
        </div>

        {!compact && mentor.breakthroughStory && (
          <div className="rounded-[var(--radius-md)] bg-surface-muted p-3">
            <p className="eyebrow mb-1 text-[0.625rem]">The Breakthrough Story</p>
            <p className="line-clamp-2-safe text-[0.8125rem] leading-relaxed text-muted-foreground">
              &ldquo;{mentor.breakthroughStory}&rdquo;
            </p>
          </div>
        )}

        {mentor.topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {mentor.topics.slice(0, 3).map((t) => (
              <Badge key={t} tone="outline">{t}</Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-end justify-between gap-3 border-t border-border-subtle p-4 sm:px-5">
        <div>
          <p className="text-[0.6875rem] font-medium text-subtle-foreground">1:1 Video Call</p>
          <p className="text-lg font-extrabold leading-tight">
            {formatINR(mentor.price1on1)}
            <span className="text-xs font-medium text-muted-foreground">
              {' '}/ {mentor.session1on1Minutes}m
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!compact && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/mentors/${mentor.id}`}>View Profile</Link>
            </Button>
          )}
          <Button variant={mentor.trialOffer ? 'group' : 'primary'} size="sm" asChild>
            <Link href={`/mentors/${mentor.id}#book`}>
              {mentor.trialOffer ? (<>Book ₹99 Trial <Zap aria-hidden /></>) : 'Book 1:1'}
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  )
}
