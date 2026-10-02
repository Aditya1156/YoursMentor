import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Serves a company logo, fetching it once and caching it in our own storage.
 *
 * The point is that the student's browser never talks to anyone but us. A
 * logo service called from the page would mean one third-party request per
 * mentor card and would hand that service a list of exactly which mentors
 * someone is looking at. Here the only outbound call happens on our server,
 * once per company, the first time anybody asks.
 *
 * The domain is validated hard before it is used. It is a path segment that
 * ends up in an outbound URL, so an unvalidated one is a server-side request
 * forgery waiting to happen.
 */
const DOMAIN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/
const BUCKET = 'company-logos'
const MAX_BYTES = 256 * 1024

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ domain: string }> }
) {
  const { domain: raw } = await params
  const domain = decodeURIComponent(raw).toLowerCase().trim()

  if (!DOMAIN.test(domain) || domain.length > 100) {
    return new NextResponse(null, { status: 400 })
  }

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return new NextResponse(null, { status: 503 })
  }

  const path = `${domain}.png`
  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path)

  // Already cached? Hand back our own URL.
  const head = await fetch(pub.publicUrl, { method: 'HEAD', cache: 'no-store' })
  if (head.ok) return NextResponse.redirect(pub.publicUrl, 307)

  // First time anyone asked for this company.
  try {
    const source = `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(domain)}`
    const res = await fetch(source, { cache: 'no-store' })
    if (!res.ok) return new NextResponse(null, { status: 404 })

    const buf = new Uint8Array(await res.arrayBuffer())
    // A favicon is a few KB. Anything large is not what we asked for.
    if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) {
      return new NextResponse(null, { status: 404 })
    }

    await admin.storage.from(BUCKET).upload(path, buf, {
      contentType: 'image/png',
      upsert: true,
      cacheControl: '31536000',
    })
    return NextResponse.redirect(pub.publicUrl, 307)
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}
