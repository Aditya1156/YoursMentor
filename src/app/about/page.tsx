import type { Metadata } from 'next'
import { Placeholder } from '@/components/shared/placeholder'

export const metadata: Metadata = { title: 'About YoursMentor' }
// No per-person content: prerendered and cached rather than built per visitor.
export const revalidate = 3600


export default function Page() {
  return <Placeholder title="About YoursMentor" specId="P7" week="Week 4" />
}
