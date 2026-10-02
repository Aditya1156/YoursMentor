import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { env } from './config/env.js'
import { publicRouter } from './routes/public.routes.js'

export function createApp() {
  const app = express()

  app.use(helmet())
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }))
  app.use(express.json({ limit: '1mb' }))

  app.get('/health', (_req, res) => res.json({ ok: true, env: env.NODE_ENV }))
  app.use('/api/public', publicRouter)

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }))

  return app
}
