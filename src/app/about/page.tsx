import type { Metadata } from 'next'
import { Placeholder } from '@/components/shared/placeholder'

export const metadata: Metadata = { title: 'About YoursMentor' }

export default function Page() {
  return <Placeholder title="About YoursMentor" specId="P7" week="Week 4" />
}
