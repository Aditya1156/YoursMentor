import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AuthCard } from '@/components/auth/auth-card'
import { SignUpForm } from '@/components/auth/signup-form'
import { getSessionUser, homeFor } from '@/lib/session'

export const metadata: Metadata = { title: 'Create account' }

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>
}) {
  const user = await getSessionUser()
  if (user) redirect(homeFor(user))

  const { role: raw } = await searchParams
  const role = raw === 'mentor' ? 'mentor' : 'student'

  return (
    <AuthCard
      title={role === 'mentor' ? 'Apply to mentor' : 'Create your account'}
      subtitle={
        role === 'mentor'
          ? 'Set up your account first — the application comes next and takes about 10 minutes.'
          : 'Book ₹99 group sessions and 1:1 calls with seniors who were exactly where you are.'
      }
      footer={
        <>
          Already have an account?{' '}
          <Link href="/signin" className="font-semibold text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <SignUpForm role={role} />
    </AuthCard>
  )
}
