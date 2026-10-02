import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AuthCard } from '@/components/auth/auth-card'
import { CompleteProfileForm } from '@/components/auth/complete-profile-form'
import { getSessionUser } from '@/lib/session'

export const metadata: Metadata = { title: 'Finish setting up' }

export default async function CompleteProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const user = await getSessionUser()
  if (!user) redirect('/signin')
  if (user.isAdultConfirmed) redirect('/dashboard')

  const { next } = await searchParams
  const safeNext = next?.startsWith('/') && !next.startsWith('//') ? next : undefined

  return (
    <AuthCard
      title={`Almost there, ${user.name.split(' ')[0]}`}
      subtitle="We need two more things before you can book a session."
    >
      <CompleteProfileForm next={safeNext} />
    </AuthCard>
  )
}
