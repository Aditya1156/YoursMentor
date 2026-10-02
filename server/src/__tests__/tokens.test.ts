import { describe, expect, it } from 'vitest'
import {
  createOneTimeToken,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../utils/tokens.js'

describe('JWTs', () => {
  it('round-trips an access token', () => {
    const t = signAccessToken({ sub: 'abc', role: 'student' })
    const p = verifyAccessToken(t)
    expect(p.sub).toBe('abc')
    expect(p.role).toBe('student')
  })

  it('expires access tokens in 15 minutes', () => {
    const p = verifyAccessToken(signAccessToken({ sub: 'abc', role: 'student' }))
    expect(p.exp - p.iat).toBe(15 * 60)
  })

  it('carries the token version on a refresh token', () => {
    expect(verifyRefreshToken(signRefreshToken({ sub: 'abc', ver: 3 })).ver).toBe(3)
  })

  it('will not verify a refresh token with the access secret', () => {
    expect(() => verifyAccessToken(signRefreshToken({ sub: 'abc', ver: 0 }))).toThrow()
  })
})

describe('one-time tokens', () => {
  it('stores only the hash, never the raw value', () => {
    const { raw, hash } = createOneTimeToken(60)
    expect(hash).not.toBe(raw)
    expect(hashToken(raw)).toBe(hash)
  })

  it('sets the expiry from the TTL', () => {
    const { expiresAt } = createOneTimeToken(60)
    const minutes = (expiresAt.getTime() - Date.now()) / 60_000
    expect(minutes).toBeGreaterThan(59)
    expect(minutes).toBeLessThanOrEqual(60)
  })

  it('never repeats', () => {
    const tokens = new Set(Array.from({ length: 200 }, () => createOneTimeToken(60).raw))
    expect(tokens.size).toBe(200)
  })
})
