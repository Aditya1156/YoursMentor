import type { Metadata } from 'next'
import { Placeholder } from '@/components/shared/placeholder'

export const metadata: Metadata = { title: 'Student dashboard' }

export default function Page() {
  return <Placeholder title="Student dashboard" specId="S2" week="Week 3" />
}
