import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { homeFor } from '@/lib/home'

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/onboarding',
  '/my-sessions',
  '/settings',
  '/notifications',
  '/checkout',
  '/room',
  '/mentor',
  '/admin',
  '/complete-profile',
]
const AUTH_PAGES = ['/signin', '/signup', '/reset']

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refreshes the auth token when needed; do not run other logic before this.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const needsAuth = PROTECTED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  )

  const redirectTo = (pathname: string, next?: string) => {
    const url = request.nextUrl.clone()
    url.pathname = pathname
    url.search = ''
    if (next) url.searchParams.set('next', next)
    return NextResponse.redirect(url)
  }

  if (!user && needsAuth) {
    return redirectTo('/signin', `${path}${request.nextUrl.search}`)
  }

  // Signed in, and on a page that is either not for them or is the front door.
  // The landing page sells the product to someone who has not joined; showing it
  // to a mentor who signed in to take a call is just an extra tap. Their own
  // dashboard is the first thing they should see.
  const atFrontDoor = path === '/'
  const atAuthPage = AUTH_PAGES.includes(path)

  if (user && (atFrontDoor || atAuthPage || (needsAuth && path !== '/complete-profile'))) {
    // One lookup serves all three decisions. The 18+ gate is enforced here as
    // well as by the `adult_needs_dob` constraint in the database, because a
    // Google sign-in arrives without a date of birth.
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_adult_confirmed, onboarding_complete')
      .eq('id', user.id)
      .single()

    if (profile) {
      const home = homeFor({
        role: profile.role,
        isAdultConfirmed: profile.is_adult_confirmed,
        onboardingComplete: profile.onboarding_complete,
      })

      // Never redirect a page to itself.
      if (home !== path) {
        if (atFrontDoor || atAuthPage) return redirectTo(home)
        if (!profile.is_adult_confirmed) {
          return redirectTo('/complete-profile', `${path}${request.nextUrl.search}`)
        }
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    // Everything except static assets and image files.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
