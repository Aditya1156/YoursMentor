import type { Metadata } from 'next'
import { Placeholder } from '@/components/shared/placeholder'

export const metadata: Metadata = { title: 'Session detail' }

export default function Page() {
  return <Placeholder title="Session detail" specId="P5" week="Week 3" />
}
