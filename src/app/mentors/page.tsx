import type { Metadata } from 'next'
import { Placeholder } from '@/components/shared/placeholder'

export const metadata: Metadata = { title: 'Mentor directory' }

export default function Page() {
  return <Placeholder title="Mentor directory" specId="P2" week="Week 2" />
}
