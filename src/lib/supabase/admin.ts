import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Service-role client. Bypasses RLS entirely, so it belongs only in paths the
 * user cannot reach directly: Razorpay webhooks, LiveKit token minting, cron
 * jobs and admin actions. Never import this into a Client Component.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
