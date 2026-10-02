import type { Metadata } from 'next'
import Link from 'next/link'
import { BadgeCheck, CalendarCheck, IndianRupee, Sparkles, Users, Video } from 'lucide-react'
import { redirect } from 'next/navigation'
import { AuthCard, AuthAside } from '@/components/auth/auth-card'
import { RoleBanner } from '@/components/auth/role-banner'
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
      asideSide="right"
      aside={
        role === 'mentor' ? (
          <AuthAside
            eyebrow="Become a mentor"
            title="An hour of your week is worth more than any course"
            points={[
              { icon: IndianRupee, text: 'Keep 75%. A full ₹99 room is about ₹742 for an hour' },
              { icon: CalendarCheck, text: 'Set your own hours, your own price, your own topics' },
              { icon: BadgeCheck, text: 'A person reviews every application within 48 hours' },
            ]}
            quote={{
              text: 'You do not need to be ten years ahead. You need to be two, and willing to say what actually worked.',
              by: 'Aditya, @refactorslife',
            }}
          />
        ) : (
          <AuthAside
            eyebrow="Start here"
            title="Talk to someone who was exactly where you are"
            points={[
              { icon: Sparkles, text: 'A 2-minute quiz matches you on college tier, home state and language' },
              { icon: Users, text: '₹99 for a live group room, or 1:1 from ₹99' },
              { icon: Video, text: 'Runs in your browser. Audio-only mode when data is tight.' },
            ]}
            quote={{
              text: 'Teachers told us off-campus product jobs were only for IITians. It was a complete lie.',
              by: 'Aditya, @refactorslife',
            }}
          />
        )
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
      <div className="mb-5">
        <RoleBanner role={role} />
      </div>
      <SignUpForm role={role} />
    </AuthCard>
  )
}
