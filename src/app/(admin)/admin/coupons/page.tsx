import type { Metadata } from 'next'
import { BadgePercent } from 'lucide-react'
import { EmptyState } from '@/components/shared/states'
import { CouponManager } from '@/components/admin/coupon-manager'
import { listCoupons } from '@/lib/queries/admin'

export const metadata: Metadata = { title: 'Coupons', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function AdminCouponsPage() {
  const coupons = await listCoupons().catch(() => [])

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl">Coupons</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Discount codes. Students enter one at checkout — codes are never listed publicly,
          so a live discount cannot be found by browsing.
        </p>
      </div>

      <CouponManager initial={coupons} />

      {coupons.length === 0 && (
        <EmptyState
          icon={<BadgePercent aria-hidden />}
          title="No coupons yet"
          description="Create one above. A good first code is a first-booking discount — it lowers the bar on the thing students hesitate most about."
        />
      )}
    </div>
  )
}
