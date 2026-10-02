import { Link } from 'react-router-dom'
import { Construction } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

/**
 * Stand-in so nothing on the Landing page dead-ends during review.
 * Each of these is replaced by its real page in Sections 8/11 of
 * docs/MASTER_PROMPT.md — delete this file once they all exist.
 */
export default function PlaceholderPage({
  title,
  specId,
  week,
}: {
  title: string
  specId: string
  week: string
}) {
  return (
    <div className="container-page py-16 md:py-24">
      <Card className="mx-auto flex max-w-xl flex-col items-center gap-3 p-8 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-surface-muted">
          <Construction className="size-5 text-subtle-foreground" aria-hidden />
        </span>
        <h1 className="text-xl">{title}</h1>
        <p className="text-sm text-muted-foreground">
          Spec <span className="font-semibold text-foreground">{specId}</span> · scheduled
          for {week}.
        </p>
        <Button variant="outline" size="sm" asChild className="mt-2">
          <Link to="/">Back to home</Link>
        </Button>
      </Card>
    </div>
  )
}
