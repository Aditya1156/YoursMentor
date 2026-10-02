'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { ErrorBanner } from '@/components/auth/error-banner'
import { Button } from '@/components/ui/button'
import { Field, PasswordInput } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { passwordField } from '@/lib/validation'

/** A4b — Choose a new password. Reached only from a recovery link. */
export function UpdatePasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    const parsed = passwordField.safeParse(password)
    if (!parsed.success) {
      setError(parsed.error.issues[0]!.message)
      return
    }
    if (password !== confirm) {
      setError('Those passwords do not match.')
      return
    }

    setLoading(true)
    const { error: updateError } = await createClient().auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {error && <ErrorBanner>{error}</ErrorBanner>}

      <Field
        label="New password"
        htmlFor="password"
        hint="At least 8 characters."
        required
      >
        <PasswordInput
          id="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>

      <Field label="Confirm new password" htmlFor="confirm" required>
        <PasswordInput
          id="confirm"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </Field>

      <Button type="submit" full size="lg" disabled={loading}>
        {loading && <Loader2 className="animate-spin" aria-hidden />}
        Save new password
      </Button>
    </form>
  )
}
