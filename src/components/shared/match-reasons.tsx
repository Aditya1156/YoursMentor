import { Globe, GraduationCap, MapPin, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { MatchReasons } from '@/lib/types'

/**
 * Why this mentor came up. Without this the quiz reads as a random list and
 * the student stops trusting it — the match is the product's whole premise.
 */
export function MatchReasonChips({ reasons }: { reasons: MatchReasons }) {
  const chips = [
    reasons.sameLanguage && { icon: Globe, label: 'Speaks your language' },
    reasons.sameState && { icon: MapPin, label: 'Same home state' },
    reasons.tierStep && { icon: GraduationCap, label: 'One step ahead of you' },
    reasons.firstGen && { icon: Sparkles, label: 'First-gen, like you' },
  ].filter(Boolean) as { icon: React.ElementType; label: string }[]

  if (!chips.length) return null

  return (
    <div className="rounded-[var(--radius-md)] bg-primary-soft p-2.5">
      <p className="eyebrow mb-1.5 text-[0.625rem]">Why this match</p>
      <div className="flex flex-wrap gap-1.5">
        {chips.map(({ icon: Icon, label }) => (
          <Badge key={label} tone="indigo">
            <Icon aria-hidden /> {label}
          </Badge>
        ))}
      </div>
    </div>
  )
}
