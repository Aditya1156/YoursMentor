import Link from 'next/link'
import { BadgeCheck, Sparkles, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { StarRating } from '@/components/shared/star-rating'
import { CompanyBadge } from '@/components/shared/company-badge'
import { MatchReasonChips } from '@/components/shared/match-reasons'
import { companyTone } from '@/lib/company'
import { TIER_LABEL, type MentorSummary } from '@/lib/types'
import { cn, formatINR } from '@/lib/utils'

/**
 * Shared by the directory, the landing strip and the quiz results.
 *
 * Every mentor reaching this card is `approved`, which means a person checked
 * their LinkedIn and ID — so the verified badge is unconditional rather than a
 * flag on the row.
 *
 * The band at the top takes its colour from where the mentor works, which is
 * what stops a grid of these reading as one grey wall. A ₹99 trial renders the
 * amber call to action, a normal 1:1 renders blue — the brand rule in
 * tokens.css, and the reason company colours never borrow amber.
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
  const tone = companyTone(mentor.company)

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)]',
        'transition-[transform,box-shadow,border-color] duration-300',
        'hover:-translate-y-1 hover:border-primary/40 hover:shadow-[var(--shadow-pop)]',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        className
      )}
    >
      {/* The header carries who they are and where they work, tinted by the
          company — which is what stops a grid of these reading as one wall. */}
      <div
        className="relative flex items-center gap-3 p-4 sm:px-5"
        style={{
          background: `linear-gradient(135deg, ${tone.bg}, ${tone.bg}66 70%, transparent 130%)`,
        }}
      >
        <span className="shrink-0 rounded-full ring-4 ring-surface transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100">
          <Avatar name={mentor.name} src={mentor.avatarUrl} size={compact ? 'lg' : 'xl'} />
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1 text-[1.0625rem] font-extrabold leading-tight tracking-tight">
            <Link href={`/mentors/${mentor.id}`} className="truncate hover:underline">
              <span className="absolute inset-0" aria-hidden />
              {mentor.name}
            </Link>
            <BadgeCheck
              className="size-4 shrink-0"
              style={{ color: tone.fg }}
              aria-label="Verified mentor"
            />
          </h3>
          <p
            className="mt-0.5 line-clamp-2-safe text-[0.8125rem] font-semibold leading-snug"
            style={{ color: tone.fg }}
          >
            {mentor.headline}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <CompanyBadge company={mentor.company} domain={mentor.companyDomain} size="sm" />
            {mentor.ratingCount > 0 && (
              <StarRating value={mentor.ratingAvg} count={mentor.ratingCount} />
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
        {mentor.collegeLine && (
          <p className="text-xs font-medium text-muted-foreground">{mentor.collegeLine}</p>
        )}

        {mentor.matchReasons && <MatchReasonChips reasons={mentor.matchReasons} />}

        <div className="flex flex-wrap gap-1.5">
          {mentor.firstGenGraduate && (
            <Badge tone="amber"><Sparkles aria-hidden /> First-Gen Grad</Badge>
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
          <div
            className="rounded-[var(--radius-md)] p-3"
            style={{ background: tone.band }}
          >
            <p className="eyebrow mb-1 text-[0.625rem]" style={{ color: tone.fg }}>
              The Breakthrough Story
            </p>
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

      <div className="relative flex items-end justify-between gap-3 border-t border-border-subtle p-4 sm:px-5">
        <div>
          <p className="text-[0.6875rem] font-medium text-subtle-foreground">1:1 Video Call</p>
          <p className="text-lg font-extrabold leading-tight">
            {formatINR(mentor.price1on1)}
            <span className="text-xs font-medium text-muted-foreground">
              {' '}/ {mentor.session1on1Minutes}m
            </span>
          </p>
        </div>
        {/* Sits above the card-wide link so these stay separately clickable. */}
        <div className="relative z-10 flex items-center gap-2">
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
    </article>
  )
}
