import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { env } from './config/env.js'
import { authRouter } from './routes/auth.routes.js'
import { publicRouter } from './routes/public.routes.js'
import { errorHandler, notFoundHandler } from './middleware/error.js'
import { passport } from './services/google.service.js'

export function createApp() {
  const app = express()

  app.set('trust proxy', 1) // Render sits behind a proxy; rate limiting needs the real IP
  app.use(helmet())
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }))
  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())
  app.use(passport.initialize())

  app.get('/health', (_req, res) => res.json({ ok: true, env: env.NODE_ENV }))
  app.use('/api/auth', authRouter)
  app.use('/api/public', publicRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
