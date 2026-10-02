import type { RequestHandler } from 'express'
import { verifyAccessToken } from '../utils/tokens.js'
import { forbidden, unauthorized } from '../utils/errors.js'
import type { AccessPayload } from '../utils/tokens.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AccessPayload
    }
  }
}

function readBearer(header?: string) {
  if (!header?.startsWith('Bearer ')) return null
  return header.slice(7).trim() || null
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = readBearer(req.headers.authorization)
  if (!token) return next(unauthorized())
  try {
    req.auth = verifyAccessToken(token)
    next()
  } catch {
    next(unauthorized('Your session has expired. Please sign in again.'))
  }
}

/** Attaches req.auth when a valid token is present, but never rejects. */
export const optionalAuth: RequestHandler = (req, _res, next) => {
  const token = readBearer(req.headers.authorization)
  if (token) {
    try {
      req.auth = verifyAccessToken(token)
    } catch {
      /* treat as signed out */
    }
  }
  next()
}

export const requireRole =
  (...roles: Array<'student' | 'mentor' | 'admin'>): RequestHandler =>
  (req, _res, next) => {
    if (!req.auth) return next(unauthorized())
    if (!roles.includes(req.auth.role)) return next(forbidden())
    next()
  }
