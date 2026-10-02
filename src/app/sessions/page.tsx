import type { Metadata } from 'next'
import { Placeholder } from '@/components/shared/placeholder'

export const metadata: Metadata = { title: 'Group sessions' }

export default function Page() {
  return <Placeholder title="Group sessions" specId="P4" week="Week 3" />
}
