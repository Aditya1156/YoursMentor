import { createBrowserClient } from '@supabase/ssr'

/** Browser client. The publishable/anon key is safe to expose — RLS is the gate. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
  )
}
