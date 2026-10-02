import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyWebhookSignature } from '@/lib/razorpay'

export const dynamic = 'force-dynamic'

/**
 * Razorpay's payment webhook — the only thing that confirms a paid seat.
 *
 * The browser is never trusted to say "I paid": the handler callback can be
 * replayed or forged. Only a body that verifies against the shared secret gets
 * to call confirm_booking(), and that function is idempotent because Razorpay
 * retries a webhook until it gets a 2xx.
 */
export async function POST(request: Request) {
  const raw = await request.text()
  const signature = request.headers.get('x-razorpay-signature')

  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    console.error('Razorpay webhook hit but RAZORPAY_WEBHOOK_SECRET is not set.')
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 503 })
  }
  if (!verifyWebhookSignature(raw, signature)) {
    // Never say why. An attacker probing signatures learns nothing.
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 })
  }

  let event: {
    event?: string
    payload?: { payment?: { entity?: Record<string, unknown> } }
  }
  try {
    event = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Bad payload.' }, { status: 400 })
  }

  const payment = event.payload?.payment?.entity
  const bookingId = (payment?.notes as Record<string, string> | undefined)?.booking_id
  const paymentId = payment?.id as string | undefined
  const orderId = payment?.order_id as string | undefined

  if (!bookingId || !paymentId) {
    // Acknowledge anything we do not handle, or Razorpay keeps retrying it.
    return NextResponse.json({ ok: true, ignored: event.event })
  }

  const admin = createAdminClient()

  await admin.from('payments').upsert(
    {
      booking_id: bookingId,
      student_id: (payment?.notes as Record<string, string>)?.student_id,
      amount: Math.round(Number(payment?.amount ?? 0) / 100),
      status: event.event === 'payment.captured' ? 'paid'
            : event.event === 'payment.failed' ? 'failed' : 'created',
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      raw_webhook: event,
    },
    { onConflict: 'razorpay_payment_id' }
  )

  if (event.event === 'payment.captured') {
    const { error } = await admin.rpc('confirm_booking', {
      p_booking: bookingId,
      p_payment_id: paymentId,
      p_order_id: orderId ?? null,
    })
    // A booking already confirmed is not an error — confirm_booking is a no-op
    // in that case, which is exactly what retries need.
    if (error) {
      console.error('confirm_booking failed for', bookingId, error.message)
      return NextResponse.json({ error: 'Could not confirm.' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
