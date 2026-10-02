import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Approve, reject or suspend a mentor.
 *
 * `status`, `strikes` and the rating columns are revoked from `authenticated`
 * precisely so a mentor cannot approve themselves, which means this has to run
 * with the service role. The caller's own admin rights are checked first, from
 * their session rather than anything they send.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  const { data: me } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') {
    return NextResponse.json({ error: 'Admins only.' }, { status: 403 })
  }

  let body: { action?: string; reason?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 })
  }

  const { action, reason } = body
  if (!['approve', 'reject', 'suspend', 'reinstate'].includes(action ?? '')) {
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
  }
  if (action === 'reject' && !reason?.trim()) {
    return NextResponse.json(
      { error: 'A rejection needs a reason — the applicant sees it.' },
      { status: 400 }
    )
  }

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY is not set.' },
      { status: 503 }
    )
  }

  const status =
    action === 'approve' ? 'approved'
    : action === 'reject' ? 'rejected'
    : action === 'suspend' ? 'suspended'
    : 'approved'

  const { error } = await admin
    .from('mentor_profiles')
    .update({
      status,
      rejection_reason: action === 'reject' ? reason!.trim() : null,
      ...(action === 'reinstate' ? { strikes: 0 } : {}),
    })
    .eq('user_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const notice = {
    approve: ['Your mentor application is approved', 'You can set availability and create ₹99 rooms now.', '/mentor'],
    reject: ['We could not approve your application', reason?.trim() ?? '', '/mentor/apply'],
    suspend: ['Your mentor account is suspended', 'Write to support@yoursmentor.in and we will go through it.', '/mentor/apply'],
    reinstate: ['Your mentor account is active again', 'Your sessions are visible to students once more.', '/mentor'],
  }[action as 'approve' | 'reject' | 'suspend' | 'reinstate']

  await admin.from('notifications').insert({
    user_id: id,
    type: `mentor_${action}`,
    title: notice[0],
    body: notice[1],
    link: notice[2],
  })

  return NextResponse.json({ status })
}
