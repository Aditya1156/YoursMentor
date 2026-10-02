import type { Metadata } from 'next'
import { Construction } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Students', robots: { index: false } }

export default function Page() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl">Students</h1>
        <p className="mt-1 text-sm text-muted-foreground">search, suspend and reactivate accounts</p>
      </div>
      <Card className="flex flex-col items-start gap-2 p-5">
        <Badge tone="amber"><Construction aria-hidden /> Next up</Badge>
        <p className="text-sm text-muted-foreground">
          Spec <span className="font-semibold text-foreground">AD3</span>. The tables and
          policies behind this are already live — only the screen is missing.
        </p>
      </Card>
    </div>
  )
}
