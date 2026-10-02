import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { OnboardingQuiz } from '@/components/onboarding/quiz'
import { requireStudent } from '@/lib/session'

export const metadata: Metadata = { title: 'Find your match' }

/** S1 — Onboarding quiz. */
export default async function OnboardingPage() {
  const user = await requireStudent('/onboarding')
  if (user.onboardingComplete) redirect('/dashboard')

  return <OnboardingQuiz initialName={user.name.split(' ')[0] ?? 'there'} />
}
