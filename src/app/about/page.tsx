import type { Metadata } from 'next'
import { Placeholder } from '@/components/shared/placeholder'

export const metadata: Metadata = { title: 'About OneStep' }

export default function Page() {
  return <Placeholder title="About OneStep" specId="P7" week="Week 4" />
}
