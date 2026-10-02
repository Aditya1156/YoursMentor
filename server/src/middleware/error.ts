import type { ErrorRequestHandler, RequestHandler } from 'express'
import { AppError } from '../utils/errors.js'
import { isProd } from '../config/env.js'

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Not found.' })
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: err.message, code: err.code })
    return
  }

  // Duplicate key — almost always a race on the unique email index.
  if (typeof err === 'object' && err && (err as { code?: number }).code === 11000) {
    res.status(409).json({ error: 'That email is already registered.' })
    return
  }

  console.error('Unhandled error:', err)
  res.status(500).json({
    error: 'Something went wrong on our side. Please try again.',
    ...(isProd ? {} : { detail: String(err) }),
  })
}
