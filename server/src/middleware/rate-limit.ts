import rateLimit, { type Options } from 'express-rate-limit'
import { env } from '../config/env.js'

/**
 * NOTE: in express-rate-limit v7, `limit: 0` blocks every request rather than
 * allowing them all. Disabling must go through `skip`.
 */
const common: Partial<Options> = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
}

/** Spec §8 A2: 5 attempts per 15 minutes. */
export const loginLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60_000,
  limit: 5,
  skipSuccessfulRequests: true,
  message: { error: 'Too many attempts. Try again in 15 minutes.' },
})

/** Signup, password reset and resend-verification: slower, cheaper to abuse. */
export const authLimiter = rateLimit({
  ...common,
  windowMs: 60 * 60_000,
  limit: 10,
  message: { error: 'Too many requests. Try again later.' },
})
