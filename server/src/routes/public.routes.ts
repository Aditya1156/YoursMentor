import { Router } from 'express'

export const publicRouter = Router()

/**
 * P1 Landing needs this. Returns [] until MentorProfile lands in Week 1/2 —
 * the client falls back to its own placeholder data for now.
 */
publicRouter.get('/featured-mentors', (_req, res) => {
  res.json({ mentors: [] })
})
