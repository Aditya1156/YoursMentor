'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight, BadgeCheck, CalendarClock, GraduationCap, Quote, RotateCcw,
  Sparkles, Users, Zap,
} from 'lucide-react'
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
 * The front answers "who is this and what do they teach". The back answers
 * "have they actually done it" — the last session they ran, what is booking
 * now, and a student's own words. That is the question a card cannot answer
 * in a quote the mentor wrote about themselves, which is what used to sit
 * here.
 *
 * Every mentor reaching this card is `approved`, so the verified badge is
 * unconditional rather than a flag on the row. A ₹99 trial renders the amber
 * call to action and a normal 1:1 renders blue — the brand rule in tokens.css.
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
  const [flipped, setFlipped] = useState(false)
  const tone = companyTone(mentor.company)
  const hasBack = !!(mentor.lastSessionTitle || mentor.nextSessionTitle || mentor.latestReview)

  const header = (
    <div
      className="relative flex items-center gap-3 p-4 sm:px-5"
      style={{
        background: `linear-gradient(135deg, ${tone.bg}, ${tone.bg}66 70%, transparent 130%)`,
      }}
    >
      <span className="shrink-0 rounded-full ring-4 ring-surface">
        <Avatar name={mentor.name} src={mentor.avatarUrl} size={compact ? 'lg' : 'xl'} />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="flex items-center gap-1 text-[1.0625rem] font-extrabold leading-tight tracking-tight">
          <Link href={`/mentors/${mentor.id}`} className="truncate hover:underline">
            {mentor.name}
          </Link>
          <BadgeCheck className="size-4 shrink-0" style={{ color: tone.fg }}
                      aria-label="Verified mentor" />
        </h3>
        <p className="mt-0.5 line-clamp-2-safe text-[0.8125rem] font-semibold leading-snug"
           style={{ color: tone.fg }}>
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
  )

  const footer = (
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
      <Button variant={mentor.trialOffer ? 'group' : 'primary'} size="sm" asChild>
        <Link href={`/mentors/${mentor.id}#book`}>
          {mentor.trialOffer ? (<>Book ₹99 Trial <Zap aria-hidden /></>) : 'Book 1:1'}
        </Link>
      </Button>
    </div>
  )

  const shell =
    'flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)]'

  return (
    <div
      className={cn('flip h-full', className)}
      data-flipped={hasBack ? String(flipped) : undefined}
    >
      <div className="flip-inner h-full">
        {/* ------------------------------------------------------- front */}
        <article
          className={cn(
            shell, 'flip-front transition-[transform,box-shadow,border-color] duration-300',
            'hover:-translate-y-1 hover:border-primary/40 hover:shadow-[var(--shadow-pop)]',
            'motion-reduce:transition-none motion-reduce:hover:translate-y-0'
          )}
          aria-hidden={flipped || undefined}
        >
          {header}

          <div className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
            {mentor.collegeLine && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <GraduationCap className="size-3.5 shrink-0" aria-hidden />
                {mentor.collegeLine}
              </p>
            )}

            {mentor.matchReasons && <MatchReasonChips reasons={mentor.matchReasons} />}

            {mentor.topics.length > 0 && (
              <div className="rounded-[var(--radius-md)] p-3" style={{ background: tone.band }}>
                <p className="eyebrow mb-1.5 text-[0.625rem]" style={{ color: tone.fg }}>
                  What they help with
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  {mentor.topics.slice(0, 4).map((t) => (
                    <li key={t}
                        className="rounded-[var(--radius-pill)] bg-surface px-2 py-0.5 text-[0.6875rem] font-semibold text-foreground">
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}

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

            {hasBack && (
              <button
                type="button"
                onClick={() => setFlipped(true)}
                aria-expanded={flipped}
                className="mt-auto flex items-center gap-1.5 self-start text-xs font-bold text-primary hover:underline"
              >
                <RotateCcw className="size-3.5" aria-hidden />
                What they&rsquo;ve been doing
              </button>
            )}
          </div>

          {footer}
        </article>

        {/* -------------------------------------------------------- back */}
        {hasBack && (
          <article
            className={cn(shell, 'flip-back')}
            aria-hidden={!flipped || undefined}
          >
            <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="eyebrow">Recent activity</p>
                <button
                  type="button"
                  onClick={() => setFlipped(false)}
                  className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-primary"
                >
                  <RotateCcw className="size-3.5" aria-hidden /> Back
                </button>
              </div>

              <p className="text-base font-extrabold leading-tight">{mentor.name}</p>

              {mentor.lastSessionTitle && (
                <div className="rounded-[var(--radius-md)] bg-surface-muted p-3">
                  <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-subtle-foreground">
                    Last session
                  </p>
                  <p className="mt-1 text-[0.8125rem] font-semibold leading-snug">
                    {mentor.lastSessionTitle}
                  </p>
                  {!!mentor.lastSessionAttendees && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="size-3" aria-hidden />
                      {mentor.lastSessionAttendees}{' '}
                      {mentor.lastSessionAttendees === 1 ? 'student' : 'students'} attended
                    </p>
                  )}
                </div>
              )}

              {mentor.nextSessionTitle && (
                <div className="rounded-[var(--radius-md)] border border-accent bg-accent-soft p-3">
                  <p className="flex items-center gap-1 text-[0.6875rem] font-bold uppercase tracking-wider text-accent-soft-foreground">
                    <CalendarClock className="size-3" aria-hidden /> Booking now
                  </p>
                  <p className="mt-1 text-[0.8125rem] font-semibold leading-snug">
                    {mentor.nextSessionTitle}
                  </p>
                </div>
              )}

              {mentor.latestReview && (
                <figure className="flex-1 rounded-[var(--radius-md)] p-3"
                        style={{ background: tone.band }}>
                  <Quote className="size-4 opacity-40" style={{ color: tone.fg }} aria-hidden />
                  <blockquote className="mt-1 line-clamp-2-safe text-[0.8125rem] leading-relaxed text-muted-foreground">
                    &ldquo;{mentor.latestReview}&rdquo;
                  </blockquote>
                  <figcaption className="mt-1.5 flex items-center gap-2 text-xs font-semibold">
                    {mentor.latestReviewAuthor ?? 'A student'}
                    {!!mentor.latestReviewRating && (
                      <StarRating value={mentor.latestReviewRating} />
                    )}
                  </figcaption>
                </figure>
              )}

              <Button variant="outline" full className="mt-auto" asChild>
                <Link href={`/mentors/${mentor.id}`}>
                  View full profile <ArrowRight aria-hidden />
                </Link>
              </Button>
            </div>

            {footer}
          </article>
        )}
      </div>
    </div>
  )
}
