const BASE = import.meta.env.VITE_API_URL ?? ''

/**
 * The access token lives in memory only (spec §3) — never localStorage, so an
 * XSS cannot walk off with it. The refresh token is an httpOnly cookie the
 * browser attaches to /api/auth automatically.
 */
let accessToken: string | null = null
export const setAccessToken = (t: string | null) => {
  accessToken = t
}
export const getAccessToken = () => accessToken

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public fieldErrors?: Record<string, string>
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type Options = Omit<RequestInit, 'body'> & { body?: unknown; skipRefresh?: boolean }

async function raw(path: string, { body, skipRefresh, ...init }: Options = {}) {
  return fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
}

/** Collapses parallel 401s into a single refresh call. */
let refreshing: Promise<boolean> | null = null

async function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const res = await raw('/api/auth/refresh', { method: 'POST', skipRefresh: true })
      if (!res.ok) return false
      const data = (await res.json()) as { accessToken: string }
      setAccessToken(data.accessToken)
      return true
    } catch {
      return false
    } finally {
      // Let the next 401 start a fresh attempt.
      queueMicrotask(() => {
        refreshing = null
      })
    }
  })()
  return refreshing
}

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  let res = await raw(path, options)

  if (res.status === 401 && !options.skipRefresh && (await refreshSession())) {
    res = await raw(path, options)
  }

  const isJson = res.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await res.json().catch(() => null) : null

  if (!res.ok) {
    if (!accessToken && res.status === 401) setAccessToken(null)
    throw new ApiError(
      res.status,
      payload?.error ?? 'Something went wrong. Please try again.',
      payload?.code,
      payload?.fieldErrors
    )
  }

  return payload as T
}

export { refreshSession }
