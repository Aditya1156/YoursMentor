import type { Metadata } from 'next'
import { Placeholder } from '@/components/shared/placeholder'

export const metadata: Metadata = { title: 'Mentor profile' }

export default function Page() {
  return <Placeholder title="Mentor profile" specId="P3" week="Week 2" />
}
