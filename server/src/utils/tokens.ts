import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export const ACCESS_TOKEN_TTL = '15m'
export const REFRESH_TOKEN_TTL_DAYS = 30

export interface AccessPayload {
  sub: string
  role: 'student' | 'mentor' | 'admin'
}
export interface RefreshPayload {
  sub: string
  /** Bumped on logout-all and on password reset, which invalidates old refreshes. */
  ver: number
}

export const signAccessToken = (p: AccessPayload) =>
  jwt.sign(p, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_TTL })

export const signRefreshToken = (p: RefreshPayload) =>
  jwt.sign(p, env.JWT_REFRESH_SECRET, { expiresIn: `${REFRESH_TOKEN_TTL_DAYS}d` })

export const verifyAccessToken = (t: string) =>
  jwt.verify(t, env.JWT_ACCESS_SECRET) as AccessPayload & { iat: number; exp: number }

export const verifyRefreshToken = (t: string) =>
  jwt.verify(t, env.JWT_REFRESH_SECRET) as RefreshPayload & { iat: number; exp: number }

/**
 * One-time tokens for email verification and password reset. The raw value goes
 * in the email; only its SHA-256 hash is stored, so a database leak cannot be
 * used to take over accounts.
 */
export function createOneTimeToken(ttlMinutes: number) {
  const raw = crypto.randomBytes(32).toString('hex')
  return {
    raw,
    hash: hashToken(raw),
    expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
  }
}

export const hashToken = (raw: string) =>
  crypto.createHash('sha256').update(raw).digest('hex')

/** Constant-time compare so token checks don't leak length or prefix. */
export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}
