import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarCheck, Video, Wallet } from 'lucide-react'
import { redirect } from 'next/navigation'
import { AuthCard, AuthAside } from '@/components/auth/auth-card'
import { SignInForm } from '@/components/auth/signin-form'
import { getSessionUser, homeFor } from '@/lib/session'

export const metadata: Metadata = { title: 'Log in' }

const ERRORS: Record<string, string> = {
  link: 'That link has expired or has already been used. Try again.',
  google: 'Google sign-in did not complete. Try again.',
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const user = await getSessionUser()
  if (user) redirect(homeFor(user))

  const { next, error } = await searchParams
  // Only ever accept a same-site path, never an absolute URL.
  const safeNext = next?.startsWith('/') && !next.startsWith('//') ? next : undefined

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to see your upcoming sessions and book your next one."
      aside={
        <AuthAside
          eyebrow="Welcome back"
          title="Your sessions are waiting"
          points={[
            { icon: CalendarCheck, text: 'Everything you have booked, with the join button live 10 minutes before' },
            { icon: Wallet, text: 'Any credits from a cancelled session, ready to spend' },
            { icon: Video, text: 'Notes and next steps from every session you attended' },
          ]}
        />
      }
      footer={
        <>
          New to YoursMentor?{' '}
          <Link href="/join" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <SignInForm next={safeNext} initialError={error ? ERRORS[error] : undefined} />
    </AuthCard>
  )
}
