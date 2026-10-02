import 'server-only'
import crypto from 'node:crypto'
import Razorpay from 'razorpay'

/**
 * Razorpay, with a guard.
 *
 * A live key charges a real card. Spec §2 says test mode first and live
 * second, so a live key outside a production build is almost always a mistake
 * — someone testing the booking flow on localhost and taking ₹99 off a real
 * student. This refuses rather than letting that happen quietly.
 */
export function razorpayMode(): 'live' | 'test' | 'unset' {
  const id = process.env.RAZORPAY_KEY_ID
  if (!id) return 'unset'
  return id.startsWith('rzp_live_') ? 'live' : 'test'
}

export class RazorpayUnavailable extends Error {}

export function getRazorpay() {
  const key_id = process.env.RAZORPAY_KEY_ID
  const key_secret = process.env.RAZORPAY_KEY_SECRET

  if (!key_id || !key_secret) {
    throw new RazorpayUnavailable('Razorpay keys are not set.')
  }

  if (razorpayMode() === 'live' && process.env.NODE_ENV !== 'production') {
    throw new RazorpayUnavailable(
      'Refusing to use a live Razorpay key outside production. ' +
        'Put rzp_test_… keys in .env.local for local work.'
    )
  }

  return new Razorpay({ key_id, key_secret })
}

/** Rupees to paise. Razorpay counts in the smallest unit. */
export const toPaise = (rupees: number) => Math.round(rupees * 100)

/**
 * Verifies a webhook body against the shared secret. Timing-safe, because a
 * naive === leaks the signature one byte at a time.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret || !signature) return false

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

/** Verifies the checkout handler's payload, which is signed differently. */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
) {
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!secret) return false
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}
