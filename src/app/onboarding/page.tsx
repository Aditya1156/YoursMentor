import type { Metadata } from 'next'
import { Placeholder } from '@/components/shared/placeholder'

export const metadata: Metadata = { title: 'Matching quiz' }

export default function Page() {
  return <Placeholder title="Matching quiz" specId="S1" week="Week 2" />
}
