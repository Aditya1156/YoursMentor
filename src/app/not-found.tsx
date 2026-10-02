import Link from 'next/link'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function NotFound() {
  return (
    <div className="container-page py-16 md:py-24">
      <Card className="mx-auto flex max-w-xl flex-col items-center gap-3 p-8 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-primary-soft">
          <Compass className="size-5 text-primary" aria-hidden />
        </span>
        <h1 className="text-xl">We could not find that page</h1>
        <p className="text-sm text-muted-foreground">
          The link may be old or mistyped. Try the mentor directory instead.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Button size="sm" asChild>
            <Link href="/mentors">Find a mentor</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}
