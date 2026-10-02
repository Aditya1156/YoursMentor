import type { Metadata } from 'next'
import { Placeholder } from '@/components/shared/placeholder'

export const metadata: Metadata = { title: 'Code of conduct' }
// No per-person content: prerendered and cached rather than built per visitor.
export const revalidate = 3600


export default function Page() {
  return <Placeholder title="Code of conduct" specId="P8" week="Week 4" />
}
