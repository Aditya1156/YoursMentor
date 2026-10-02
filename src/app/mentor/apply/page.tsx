import type { Metadata } from 'next'
import { Placeholder } from '@/components/shared/placeholder'

export const metadata: Metadata = { title: 'Mentor application' }

export default function Page() {
  return <Placeholder title="Mentor application" specId="M1" week="Week 1" />
}
