import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * A client with no cookies, for data that is the same for everybody.
 *
 * The cookie-bound server client calls cookies(), and a single such call
 * anywhere in a route makes the whole route dynamic. The landing page and the
 * mentor directory read nothing viewer-specific — mentor_directory already
 * filters itself to approved mentors on active accounts, and group sessions are
 * public — so paying for per-request rendering bought nothing and cost every
 * visitor their first byte.
 *
 * Anon key only, so RLS applies exactly as it does to a signed-out visitor,
 * which is the audience these reads are for. Never use this where the answer
 * depends on who is asking.
 */
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
