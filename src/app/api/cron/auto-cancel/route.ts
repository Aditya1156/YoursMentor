import { runCron } from '@/lib/cron'

export const dynamic = 'force-dynamic'

/**
 * Cancels group rooms that are still under their minimum 6 hours out, and
 * refunds everyone in credits (spec §7). Runs hourly — the window it acts on
 * is six hours wide, so anything finer is wasted work.
 */
export async function GET(request: Request) {
  return runCron(request, 'auto-cancel', 'auto_cancel_under_minimum')
}
