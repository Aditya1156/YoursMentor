import 'dotenv/config'
import { z } from 'zod'

/** Fail at boot, not at the first request. */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  MONGODB_URI: z.string().optional(),
  PLATFORM_COMMISSION_PERCENT: z.coerce.number().min(0).max(100).default(25),
})

export const env = schema.parse(process.env)
