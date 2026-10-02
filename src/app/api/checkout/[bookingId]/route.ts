import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRazorpay, RazorpayUnavailable, toPaise } from '@/lib/razorpay'

/**
 * Starts payment for a held booking.
 *
 * Credits are spent here rather than in the browser: the ledger is
 * append-only and the client has no write access to it, so the balance is
 * re-read server-side and the debit is written with the service role. A
 * booking whose credits cover it in full is confirmed immediately; anything
 * with a remainder needs Razorpay, which is wired once keys exist.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })
  }

  // RLS scopes this to the caller's own bookings.
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, student_id, status, amount, hold_expires_at')
    .eq('id', bookingId)
    .maybeSingle()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
  }
  if (booking.status === 'confirmed') {
    return NextResponse.json({ status: 'confirmed' })
  }
  if (booking.status !== 'held') {
    return NextResponse.json({ error: 'That booking is no longer open.' }, { status: 409 })
  }
  if (booking.hold_expires_at && new Date(booking.hold_expires_at) < new Date()) {
    return NextResponse.json(
      { error: 'Your hold expired and the seat went back to the room.' },
      { status: 410 }
    )
  }

  let useCredits = false
  try {
    useCredits = !!(await request.json())?.useCredits
  } catch {
    /* body is optional */
  }

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return NextResponse.json(
      { error: 'Payments are not configured yet. Add SUPABASE_SERVICE_ROLE_KEY.' },
      { status: 503 }
    )
  }

  // Balance comes from the ledger, never from the client.
  const { data: balanceRow } = await admin.rpc('credit_balance', { p_user: user.id })
  const balance = Number(balanceRow ?? 0)
  const creditsApplied = useCredits ? Math.min(balance, booking.amount) : 0
  const remainder = booking.amount - creditsApplied

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

    // The booking id rides along in notes so the webhook can find it again.
    const order = await razorpay.orders.create({
      amount: toPaise(remainder),
      currency: 'INR',
      receipt: booking.id,
      notes: { booking_id: booking.id, student_id: user.id },
    })

    await admin.from('payments').upsert(
      {
        booking_id: booking.id,
        student_id: user.id,
        amount: remainder,
        status: 'created',
        razorpay_order_id: order.id,
      },
      { onConflict: 'razorpay_order_id' }
    )

    await admin
      .from('bookings')
      .update({ razorpay_order_id: order.id, credits_applied: creditsApplied })
      .eq('id', booking.id)

    return NextResponse.json({
      status: 'payment_required',
      razorpayOrderId: order.id,
      razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: toPaise(remainder),
      creditsApplied,
    })
  }

  // Fully covered by credits. Debit first — if confirm fails we would rather
  // leave an unspent balance than a confirmed seat nobody paid for.
  if (creditsApplied > 0) {
    const { error: debitError } = await admin.from('credit_ledger').insert({
      user_id: user.id,
      amount: -creditsApplied,
      reason: 'Seat paid with credits',
      booking_id: booking.id,
    })
    if (debitError) {
      return NextResponse.json({ error: 'Could not apply your credits.' }, { status: 500 })
    }
    await admin.from('bookings').update({ credits_applied: creditsApplied }).eq('id', booking.id)
  }

  const { error: confirmError } = await admin.rpc('confirm_booking', {
    p_booking: booking.id,
    p_payment_id: `credits_${booking.id}`,
    p_order_id: null,
  })
  if (confirmError) {
    return NextResponse.json({ error: confirmError.message }, { status: 409 })
  }

  return NextResponse.json({ status: 'confirmed', creditsApplied })
}
