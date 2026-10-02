import { runCron } from '@/lib/cron'

export const dynamic = 'force-dynamic'

/**
 * Deletes accounts whose 30-day grace period has run out. Daily is often
 * enough — the window is thirty days wide, and this is the one job that
 * destroys data, so it should run rarely and predictably.
 */
export async function GET(request: Request) {
  return runCron(request, 'purge-accounts', 'purge_deleted_accounts')
}
