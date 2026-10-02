import type { Metadata } from 'next'
import { Placeholder } from '@/components/shared/placeholder'

export const metadata: Metadata = { title: 'Notifications' }

export default function Page() {
  return <Placeholder title="Notifications" specId="Shared" week="Week 4" />
}
