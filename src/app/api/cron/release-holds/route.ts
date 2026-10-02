import { runCron } from '@/lib/cron'

export const dynamic = 'force-dynamic'

/**
 * Releases seats whose 10-minute payment window closed.
 *
 * The most time-sensitive of the three: until this runs, an abandoned checkout
 * is still occupying a seat nobody paid for, and a room of 15 can look full
 * while being empty. Runs every 5 minutes.
 */
export async function GET(request: Request) {
  return runCron(request, 'release-holds', 'release_expired_holds')
}
