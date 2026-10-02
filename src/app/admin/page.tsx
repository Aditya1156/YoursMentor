import type { Metadata } from 'next'
import { Placeholder } from '@/components/shared/placeholder'

export const metadata: Metadata = { title: 'Admin dashboard' }

export default function Page() {
  return <Placeholder title="Admin dashboard" specId="AD1" week="Week 2" />
}
