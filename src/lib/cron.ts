import 'server-only'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Shared guard and runner for the scheduled jobs.
 *
 * These endpoints move seats and money with the service role, so they must not
 * be callable by anyone who finds the URL. Vercel Cron signs its requests with
 * CRON_SECRET as a bearer token; without that variable set the route refuses
 * everything, which is the safe default rather than an open endpoint.
 *
 * The comparison is timing-safe. A plain === on a secret leaks it one byte at
 * a time to anyone willing to measure.
 */
function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const header = request.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (token.length !== secret.length) return false

  let diff = 0
  for (let i = 0; i < secret.length; i++) {
    diff |= token.charCodeAt(i) ^ secret.charCodeAt(i)
  }
  return diff === 0
}

export async function runCron(
  request: Request,
  name: string,
  fn: string,
  args: Record<string, unknown> = {}
) {
  if (!authorised(request)) {
    if (!process.env.CRON_SECRET) {
      console.error(`Cron ${name} called but CRON_SECRET is not set.`)
    }
    return NextResponse.json({ error: 'Not authorised.' }, { status: 401 })
  }

  const started = Date.now()
  try {
    const { data, error } = await createAdminClient().rpc(fn, args)
    if (error) throw error

    const result = { job: name, affected: data ?? 0, ms: Date.now() - started }
    console.log('cron', JSON.stringify(result))
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error(`cron ${name} failed:`, message)
    return NextResponse.json({ ok: false, job: name, error: message }, { status: 500 })
  }
}
