import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRazorpay, RazorpayUnavailable, toPaise } from '@/lib/razorpay'

/**
 * Buys a plan.
 *
 * Same order of payment as a booking: credits first, then a card. Credits are
 * what makes this testable before Razorpay is switched on, and a student with a
 * refund balance should be able to spend it on a plan rather than being asked
 * for money while it sits there.
 *
 * The subscription is only started once something has actually paid for it —
 * start_subscription() is service_role and trusts this route on that point,
 * exactly as confirm_booking() does.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })
  }

  let code: string | null = null
  let useCredits = false
  let coupon: string | null = null
  try {
    const body = await request.json()
    code = typeof body?.plan === 'string' ? body.plan : null
    useCredits = !!body?.useCredits
    coupon = typeof body?.coupon === 'string' && body.coupon.trim()
      ? body.coupon.trim()
      : null
  } catch {
    /* handled below */
  }
  if (!code) {
    return NextResponse.json({ error: 'Which plan?' }, { status: 400 })
  }

  // Price comes from the table, never from the request.
  const { data: plan } = await supabase
    .from('plans')
    .select('code, name, price')
    .eq('code', code)
    .eq('active', true)
    .maybeSingle()

  if (!plan) {
    return NextResponse.json({ error: 'That plan is not available.' }, { status: 404 })
  }
  // The trial is granted on signup, never bought.
  if (plan.price <= 0) {
    return NextResponse.json({ error: 'That plan is not for sale.' }, { status: 400 })
  }

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return NextResponse.json({ error: 'Payments are not configured yet.' }, { status: 503 })
  }

  // The discount is worked out by the database, against the price in the table —
  // never from anything the client sent.
  let couponId: string | null = null
  let discount = 0
  if (coupon) {
    const { data: previewed, error: couponError } = await supabase.rpc(
      'preview_coupon_for_amount',
      { p_code: coupon, p_amount: plan.price }
    )
    if (couponError) {
      return NextResponse.json({ error: couponError.message }, { status: 400 })
    }
    const row = (previewed ?? [])[0]
    if (row) {
      couponId = row.coupon_id
      discount = Number(row.amount_off ?? 0)
    }
  }

  const payable = Math.max(0, plan.price - discount)

  const { data: balanceRow } = await admin.rpc('credit_balance', { p_user: user.id })
  const balance = Number(balanceRow ?? 0)
  const creditsApplied = useCredits ? Math.min(balance, payable) : 0
  const remainder = payable - creditsApplied

  if (remainder > 0) {
    let razorpay
    try {
      razorpay = getRazorpay()
    } catch (e) {
      return NextResponse.json(
        {
          error: e instanceof RazorpayUnavailable
            ? e.message
            : 'Card and UPI payment is not switched on yet.',
        },
        { status: 503 }
      )
    }
    const order = await razorpay.orders.create({
      amount: toPaise(remainder),
      currency: 'INR',
      receipt: `${plan.code}_${user.id.slice(0, 8)}`,
      notes: {
        plan: plan.code, user_id: user.id, kind: 'subscription',
        coupon_id: couponId ?? '', discount: String(discount),
      },
    })
    return NextResponse.json({
      status: 'payment_required',
      razorpayOrderId: order.id,
      razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: toPaise(remainder),
      creditsApplied,
      discount,
    })
  }

  // Covered by credits. Debit first: an unspent balance is a smaller problem
  // than a subscription nobody paid for.
  if (creditsApplied > 0) {
    const { error: debitError } = await admin.from('credit_ledger').insert({
      user_id: user.id,
      amount: -creditsApplied,
      reason: `${plan.name} subscription`,
    })
    if (debitError) {
      return NextResponse.json({ error: 'Could not apply your credits.' }, { status: 500 })
    }
  }

  const { error: startError } = await admin.rpc('start_subscription', {
    p_user: user.id,
    p_plan_code: plan.code,
    p_payment_ref: couponId ? `coupon_${Date.now()}` : `credits_${Date.now()}`,
  })
  if (startError) {
    return NextResponse.json({ error: startError.message }, { status: 409 })
  }

  // Counted only once the plan is actually running, so a failed start does not
  // burn somebody's code.
  if (couponId) {
    await admin.rpc('redeem_coupon_for_plan', {
      p_coupon: couponId, p_user: user.id, p_amount_off: discount,
    })
  }

  return NextResponse.json({
    status: 'active', plan: plan.code, creditsApplied, discount,
  })
}
