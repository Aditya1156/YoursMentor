import type { Metadata } from 'next'
import Link from 'next/link'
import { AuthCard } from '@/components/auth/auth-card'
import { ResetForm } from '@/components/auth/reset-form'

export const metadata: Metadata = { title: 'Reset password' }

export default function ResetPage() {
  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter the email you signed up with and we will send you a link."
      footer={
        <Link href="/signin" className="font-semibold text-primary hover:underline">
          Back to log in
        </Link>
      }
    >
      <ResetForm />
    </AuthCard>
  )
}
