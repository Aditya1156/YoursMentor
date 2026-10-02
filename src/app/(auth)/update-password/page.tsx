import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AuthCard } from '@/components/auth/auth-card'
import { UpdatePasswordForm } from '@/components/auth/update-password-form'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Choose a new password' }

export default async function UpdatePasswordPage() {
  // /auth/confirm already exchanged the recovery token for a session.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/reset')

  return (
    <AuthCard
      title="Choose a new password"
      subtitle="Picking a new password signs you out everywhere else."
    >
      <UpdatePasswordForm />
    </AuthCard>
  )
}
