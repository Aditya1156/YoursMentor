import type { NextConfig } from 'next'

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined

/**
 * Response headers.
 *
 * Deliberately not a Content-Security-Policy yet. Next.js needs either
 * 'unsafe-inline' for scripts — which gives away most of what a CSP is for — or
 * per-request nonces, and getting a nonce policy wrong on a site that takes
 * payments and runs WebRTC fails silently in someone else's browser. The draft
 * policy and what it has to allow are in docs/SECURITY.md; it wants a real
 * browser test before it goes anywhere near production.
 *
 * Permissions-Policy is the one to read twice: the session room needs camera,
 * microphone and display-capture, so they are allowed for our own origin rather
 * than denied wholesale. A policy copied from a blog post would break every
 * call on the platform.
 */
const securityHeaders = [
  // Tell browsers never to try this origin over plain HTTP again.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // No MIME sniffing: an uploaded avatar must not be executed as a script.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // We are never meant to be framed; it is how clickjacking starts.
  { key: 'X-Frame-Options', value: 'DENY' },
  // Send the origin to other sites, the full path only to ourselves. Session and
  // booking URLs contain ids that third parties have no business seeing.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Media for us, nothing for anyone we embed. geolocation and the rest are off.
  {
    key: 'Permissions-Policy',
    value: [
      'camera=(self)',
      'microphone=(self)',
      'display-capture=(self)',
      'geolocation=()',
      'payment=(self)',
      'usb=()',
      'bluetooth=()',
      'magnetometer=()',
      'accelerometer=()',
    ].join(', '),
  },
  // Keep us out of Google's FLoC-style cohorts.
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Our version is not a thing an attacker needs to know.
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        // A room URL identifies a private call. Keep it out of search engines
        // and out of the referrer entirely.
        source: '/room/:path*',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/(admin|mentor)/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ]
  },
  images: {
    remotePatterns: [
      // Avatars and mentor photos in Supabase Storage.
      ...(supabaseHost
        ? [{ protocol: 'https' as const, hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }]
        : []),
      // Profile photos that come back from Google sign-in.
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      // YouTube poster frames for the click-to-load video facade.
      { protocol: 'https', hostname: 'i.ytimg.com' },
    ],
  },
}

export default nextConfig
