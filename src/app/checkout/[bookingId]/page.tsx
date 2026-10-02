import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { CheckoutPanel } from '@/components/checkout/checkout-panel'
import { getBooking, creditBalance } from '@/lib/queries/bookings'
import { getSessionUser } from '@/lib/session'

export const metadata: Metadata = { title: 'Checkout' }
export const dynamic = 'force-dynamic'   // a held seat is never cacheable

/** S3 — Checkout. */
export default async function CheckoutPage({
  params,
}: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params
  const viewer = await getSessionUser()
  if (!viewer) redirect(`/signin?next=${encodeURIComponent(`/checkout/${bookingId}`)}`)

  const booking = await getBooking(bookingId).catch(() => null)
  if (!booking) notFound()

  // Already paid: nothing to do here.
  if (booking.status === 'confirmed' || booking.status === 'attended') {
    redirect(`/booking/${bookingId}/confirmed`)
  }

  const credits = await creditBalance().catch(() => 0)

  return (
    <CheckoutPanel
      booking={{
        id: booking.id,
        status: booking.status,
        amount: booking.amount,
        holdExpiresAt: booking.holdExpiresAt,
        session: {
          id: booking.session.id,
          title: booking.session.title,
          startAt: booking.session.startAt,
          endAt: booking.session.endAt,
          mentorName: booking.session.mentorName,
          mentorAvatarUrl: booking.session.mentorAvatarUrl,
        },
      }}
      creditBalance={credits}
      razorpayEnabled={!!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID}
    />
  )
}
