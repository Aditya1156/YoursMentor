import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Hands the signed-in person everything we hold about them, as a file.
 *
 * The gathering happens in export_my_data(), which is scoped to auth.uid() and
 * takes no argument — there is nothing here to tamper with. This route only
 * turns the result into a download.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Please sign in.', { status: 401 })

  const { data, error } = await supabase.rpc('export_my_data')
  if (error) return new Response(error.message, { status: 500 })

  const date = new Date().toISOString().slice(0, 10)
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="yoursmentor-data-${date}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}
