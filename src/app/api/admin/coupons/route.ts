import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/** Every admin write re-checks the role from the session, never from the body. */
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Please sign in.' }, { status: 401 }) }
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (data?.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Admins only.' }, { status: 403 }) }
  }
  return { adminId: user.id }
}

export async function POST(request: Request) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 })
  }

  const code = String(body.code ?? '').trim().toUpperCase()
  const kind = body.kind === 'flat' ? 'flat' : 'percent'
  const value = Number(body.value)

  if (!/^[A-Z0-9]{3,24}$/.test(code)) {
    return NextResponse.json(
      { error: 'Code must be 3 to 24 letters or digits.' },
      { status: 400 }
    )
  }
  if (!Number.isFinite(value) || value <= 0) {
    return NextResponse.json({ error: 'Enter a discount value.' }, { status: 400 })
  }
  if (kind === 'percent' && value > 100) {
    return NextResponse.json({ error: 'A percentage cannot exceed 100.' }, { status: 400 })
  }

  const db = createAdminClient()
  const { data, error } = await db
    .from('coupons')
    .insert({
      code,
      description: body.description ? String(body.description).slice(0, 200) : null,
      kind,
      value: Math.round(value),
      max_discount: body.maxDiscount ? Math.round(Number(body.maxDiscount)) : null,
      min_amount: body.minAmount ? Math.round(Number(body.minAmount)) : 0,
      scope: ['any', 'group_only', 'one_on_one_only', 'first_booking']
        .includes(String(body.scope)) ? body.scope : 'any',
      max_redemptions: body.maxRedemptions ? Math.round(Number(body.maxRedemptions)) : null,
      max_redemptions_per_user: body.maxPerUser ? Math.round(Number(body.maxPerUser)) : 1,
      expires_at: body.expiresAt ? new Date(String(body.expiresAt)).toISOString() : null,
      created_by: guard.adminId,
    })
    .select('id, code')
    .single()

  if (error) {
    return NextResponse.json(
      { error: error.code === '23505' ? `${code} already exists.` : error.message },
      { status: 400 }
    )
  }

  await db.from('admin_actions').insert({
    admin_id: guard.adminId, action: 'coupon_created',
    target_type: 'coupon', target_id: data.id, detail: { code, kind, value },
  })

  return NextResponse.json({ id: data.id, code: data.code })
}

export async function PATCH(request: Request) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id, active } = await request.json()
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 })

  const db = createAdminClient()
  const { error } = await db.from('coupons').update({ active: !!active }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await db.from('admin_actions').insert({
    admin_id: guard.adminId,
    action: active ? 'coupon_enabled' : 'coupon_disabled',
    target_type: 'coupon', target_id: id,
  })

  return NextResponse.json({ ok: true })
}
