'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Loader2, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** The one interactive piece of ErrorState, split out so the rest stays server-side. */
export function RetryButton() {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => start(() => router.refresh())}
    >
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : <RotateCw aria-hidden />}
      Try again
    </Button>
  )
}
