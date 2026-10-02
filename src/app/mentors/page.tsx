import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck, Sparkles, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { MentorCard } from '@/components/shared/mentor-card'
import { EmptyState, ErrorState } from '@/components/shared/states'
import { DirectoryFilters, type FilterOptions } from '@/components/mentors/directory-filters'
import { Pagination } from '@/components/shared/pagination'
import { listMentors, mentorFilterOptions, type MentorFilters } from '@/lib/queries/mentors'
import type { CollegeTier, Track } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Find a mentor who gets you',
  description:
    'Filter near-peer mentors by college tier, home state, language, first-generation status and career track. Talk to seniors one to three steps ahead.',
}

type Search = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

function parse(sp: Search): MentorFilters {
  const tier = one(sp.tier)
  const track = one(sp.track)
  const sort = one(sp.sort)
  return {
    q: one(sp.q) || undefined,
    track: (['first_job', 'abroad'] as const).includes(track as Track)
      ? (track as Track) : undefined,
    topic: one(sp.topic) || undefined,
    language: one(sp.language) || undefined,
    state: one(sp.state) || undefined,
    tier: (['tier1', 'tier2', 'tier3', 'other'] as const).includes(tier as CollegeTier)
      ? (tier as CollegeTier) : undefined,
    firstGen: one(sp.firstGen) === 'true',
    maxPrice: one(sp.maxPrice) ? Number(one(sp.maxPrice)) : undefined,
    sort: (['recommended', 'rating', 'price_low', 'price_high'] as const)
      .includes(sort as never) ? (sort as MentorFilters['sort']) : 'recommended',
    page: Math.max(1, Number(one(sp.page) ?? 1) || 1),
  }
}

/** P2 — Mentor directory. */
export default async function MentorsPage({
  searchParams,
}: {
  searchParams: Promise<Search>
}) {
  const sp = await searchParams
  const filters = parse(sp)

  let result: Awaited<ReturnType<typeof listMentors>> | null = null
  let options: FilterOptions = {
    languages: [], states: [], topics: [], minPrice: 99, maxPrice: 499,
  }
  let failed = false

  try {
    ;[result, options] = await Promise.all([listMentors(filters), mentorFilterOptions()])
  } catch {
    failed = true
  }

  return (
    <div className="container-page flex flex-col gap-6 py-8 md:py-10">
      <Card className="bg-surface-muted p-5 sm:p-7">
        <Badge tone="amber" size="md" className="self-start">
          <Sparkles aria-hidden /> Near-peer discovery
        </Badge>
        <h1 className="mt-3 text-2xl sm:text-3xl md:text-[2rem]">Find a Mentor Who Gets You</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Filtered by college tier, native language, first-generation graduate status and
          career track. Talk to folks just one to three steps ahead.
        </p>
      </Card>

      <DirectoryFilters options={options} />

      {failed ? (
        <ErrorState description="We could not load the mentor list. Check your connection and try again." />
      ) : !result || result.total === 0 ? (
        <EmptyState
          icon={Users}
          title={
            Object.values(filters).some((v) => v !== undefined && v !== false && v !== 1 && v !== 'recommended')
              ? 'No mentors match those filters yet'
              : 'Our first mentors are being verified'
          }
          description="Every mentor is reviewed by a person before they are listed. Clear the filters, or tell us what you are looking for and we will find someone."
          actionLabel="Clear all filters"
          actionHref="/mentors"
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Showing{' '}
              <span className="font-bold text-foreground">{result.total}</span>{' '}
              {result.total === 1 ? 'mentor' : 'mentors'} matching your journey
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="green">Non-metro / Tier 2-3 roots</Badge>
              <Badge tone="indigo">100% verified workplaces</Badge>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {result.mentors.map((m) => (
              <MentorCard key={m.id} mentor={m} />
            ))}
          </div>

          <Pagination page={result.page} pageCount={result.pageCount} />
        </>
      )}

      <Card className="flex flex-col gap-3 bg-primary-soft p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-base">100% Student Psychological Safety Guarantee</h2>
            <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted-foreground">
              Never feel judged for imperfect English, a Tier-3 college name, or a gap year.
              Every mentor signs the YoursMentor Empathy Charter.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild className="shrink-0">
          <Link href="/code-of-conduct">Read the code of conduct</Link>
        </Button>
      </Card>
    </div>
  )
}
