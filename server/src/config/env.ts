import 'dotenv/config'
import { z } from 'zod'

/** Fail at boot, not at the first request. */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  MONGODB_URI: z.string().optional(),

  // Dev-only fallbacks keep `npm run dev` working before secrets exist.
  // Production is checked separately below — never ship these values.
  JWT_ACCESS_SECRET: z.string().min(16).default('dev-access-secret-change-me'),
  JWT_REFRESH_SECRET: z.string().min(16).default('dev-refresh-secret-change-me'),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('OneStep <onboarding@resend.dev>'),

  PLATFORM_COMMISSION_PERCENT: z.coerce.number().min(0).max(100).default(25),
})

export const env = schema.parse(process.env)

if (env.NODE_ENV === 'production') {
  const required = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'MONGODB_URI'] as const
  for (const key of required) {
    if (!process.env[key]) throw new Error(`${key} must be set in production`)
  }
  if (env.JWT_ACCESS_SECRET.startsWith('dev-') || env.JWT_REFRESH_SECRET.startsWith('dev-')) {
    throw new Error('Refusing to start in production with the development JWT secrets')
  }
}

export const isProd = env.NODE_ENV === 'production'
