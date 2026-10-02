import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createPublicClient } from '@/lib/supabase/public'
import { getSessionUser } from '@/lib/session'
import { PlanCards, type PlanCard, type CurrentSub } from '@/components/pricing/plan-cards'

export const metadata: Metadata = {
  title: 'Plans and pricing',
  description:
    'Book one ₹99 group session, or take a monthly plan: Pod for four sessions a month, Pro for four plus two 1:1 calls.',
}
export const dynamic = 'force-dynamic'

export default async function PricingPage() {
  // Plans are public, so they are read without cookies.
  const { data: planRows } = await createPublicClient()
    .from('plans')
    .select('code, name, description, price, group_sessions, one_on_ones, duration_days')
    .eq('active', true)
    // The free trial is granted at signup, not bought, so it is not a column here.
    .gt('price', 0)
    .order('price')

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const plans: PlanCard[] = (planRows ?? []).map((p: any) => ({
    code: p.code,
    name: p.name,
    description: p.description ?? null,
    price: p.price,
    groupSessions: p.group_sessions,
    oneOnOnes: p.one_on_ones,
    durationDays: p.duration_days,
  }))

  const viewer = await getSessionUser()
  let current: CurrentSub | null = null
  if (viewer) {
    const supabase = await createClient()
    const { data } = await supabase.rpc('my_subscription')
    const row = (data ?? [])[0] as any
    if (row) {
      current = {
        planCode: row.plan_code,
        expiresAt: row.expires_at,
        groupRemaining: row.group_remaining,
        oneOnOneRemaining: row.one_on_one_remaining,
      }
    }
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return (
    <div className="container-page max-w-5xl py-10 md:py-14">
      <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
        Pay per session, or by the month
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
        A single ₹99 room is the cheapest way to find out whether this helps. If it
        does, a plan works out at about a third of the price and your pod keeps you
        turning up.
      </p>
      <div className="mt-8">
        <PlanCards
          plans={plans}
          current={current}
          credits={viewer?.creditsBalance ?? 0}
          signedIn={!!viewer}
        />
      </div>
    </div>
  )
}
