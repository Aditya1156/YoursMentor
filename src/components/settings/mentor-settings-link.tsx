import Link from 'next/link'
import { ArrowRight, Briefcase, CalendarClock, IndianRupee } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CompanyBadge } from '@/components/shared/company-badge'

/**
 * A mentor's public profile is a different thing from their account settings:
 * one is what students read before paying, the other is how we reach them.
 * Editing both on one page would mean two "save" buttons meaning different
 * things, so this points at the mentor editor rather than duplicating it.
 */
export function MentorSettingsLink({
  status, company, companyDomain, headline, price,
}: {
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  company?: string
  companyDomain?: string
  headline?: string
  price?: number
}) {
  const live = status === 'approved'

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base">
          <Briefcase className="size-4 text-subtle-foreground" aria-hidden /> Your mentor profile
        </h2>
        <Badge tone={live ? 'green' : status === 'pending' ? 'amber' : 'danger'}>
          {live ? 'Live in the directory' : status}
        </Badge>
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">
        {live
          ? 'What students read before they book you — your story, your topics, your company and your price.'
          : 'Not visible to students yet. We review every application by hand.'}
      </p>

      <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] bg-surface-muted p-3">
        <CompanyBadge company={company} domain={companyDomain} />
        {headline && (
          <span className="text-xs font-semibold text-muted-foreground">{headline}</span>
        )}
        {!!price && (
          <span className="ml-auto flex items-center gap-1 text-xs font-bold">
            <IndianRupee className="size-3" aria-hidden />{price} / 30m
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href={live ? '/mentor/profile' : '/apply-to-mentor'}>
            Edit mentor profile <ArrowRight aria-hidden />
          </Link>
        </Button>
        {live && (
          <Button variant="outline" asChild>
            <Link href="/mentor/availability">
              <CalendarClock aria-hidden /> Availability
            </Link>
          </Button>
        )}
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Your company and its logo are set there, along with your topics and pricing.
      </p>
    </Card>
  )
}
