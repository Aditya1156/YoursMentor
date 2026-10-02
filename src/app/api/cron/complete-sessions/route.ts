import { runCron } from '@/lib/cron'

export const dynamic = 'force-dynamic'

/**
 * Closes sessions 15 minutes after they end, marks confirmed bookings as
 * attended, bumps the mentor's session count and asks students to rate.
 *
 * Nothing downstream happens without this: earnings only count completed
 * sessions, and a student is only allowed to review a booking they attended.
 * Runs every 15 minutes.
 */
export async function GET(request: Request) {
  return runCron(request, 'complete-sessions', 'complete_finished_sessions')
}
