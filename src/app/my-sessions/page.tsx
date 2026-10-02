import type { Metadata } from 'next'
import { Placeholder } from '@/components/shared/placeholder'

export const metadata: Metadata = { title: 'My sessions' }

export default function Page() {
  return <Placeholder title="My sessions" specId="S5" week="Week 3" />
}
