import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/** Polled by checkout while it waits for the Razorpay webhook to land. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // RLS scopes this to the caller's own bookings.
  const { data } = await supabase
    .from('bookings').select('status').eq('id', id).maybeSingle()

  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ status: data.status })
}
