import type { RequestHandler } from 'express'
import type { ZodSchema } from 'zod'

/** Replaces req.body with the parsed value so handlers get typed, clean input. */
export const validateBody =
  (schema: ZodSchema): RequestHandler =>
  (req, res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const key = issue.path.join('.') || '_'
        fieldErrors[key] ??= issue.message
      }
      res.status(400).json({ error: 'Please check the form.', fieldErrors })
      return
    }
    req.body = result.data
    next()
  }
