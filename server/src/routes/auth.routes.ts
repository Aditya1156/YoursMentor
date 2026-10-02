import { Router } from 'express'
import * as ctrl from '../controllers/auth.controller.js'
import { validateBody } from '../middleware/validate.js'
import { requireAuth } from '../middleware/auth.js'
import { authLimiter, loginLimiter } from '../middleware/rate-limit.js'
import {
  completeGoogleSignupSchema,
  forgotPasswordSchema,
  loginSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  signupSchema,
  verifyEmailSchema,
} from '../schemas/auth.schema.js'
import { googleEnabled, passport } from '../services/google.service.js'
import { issueSession } from '../services/auth.service.js'
import { env } from '../config/env.js'
import type { UserDoc } from '../models/user.model.js'

export const authRouter = Router()

authRouter.post('/signup', authLimiter, validateBody(signupSchema), ctrl.signup)
authRouter.post('/login', loginLimiter, validateBody(loginSchema), ctrl.login)
authRouter.post('/refresh', ctrl.refresh)
authRouter.post('/logout', ctrl.logout)
authRouter.get('/me', requireAuth, ctrl.me)

authRouter.post('/verify-email', validateBody(verifyEmailSchema), ctrl.verifyEmail)
authRouter.post(
  '/resend-verification',
  authLimiter,
  validateBody(resendVerificationSchema),
  ctrl.resendVerification
)
authRouter.post(
  '/forgot-password',
  authLimiter,
  validateBody(forgotPasswordSchema),
  ctrl.forgotPassword
)
authRouter.post('/reset-password', authLimiter, validateBody(resetPasswordSchema), ctrl.resetPassword)
authRouter.post(
  '/complete-signup',
  requireAuth,
  validateBody(completeGoogleSignupSchema),
  ctrl.completeGoogleSignup
)

if (googleEnabled) {
  authRouter.get(
    '/google',
    (req, _res, next) => {
      // Carry ?role= and ?returnTo= through Google and back.
      const state = Buffer.from(
        JSON.stringify({ role: req.query.role, returnTo: req.query.returnTo })
      ).toString('base64url')
      passport.authenticate('google', { session: false, state })(req, _res, next)
    }
  )

  authRouter.get(
    '/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: `${env.CLIENT_URL}/login?error=google` }),
    (req, res) => {
      const user = req.user as UserDoc
      const { accessToken } = issueSession(res, user, user.tokenVersion ?? 0)

      let returnTo = '/dashboard'
      try {
        const state = JSON.parse(
          Buffer.from(String(req.query.state ?? ''), 'base64url').toString()
        ) as { returnTo?: string }
        // Only ever accept a same-site path, never an absolute URL.
        if (state.returnTo?.startsWith('/') && !state.returnTo.startsWith('//')) {
          returnTo = state.returnTo
        }
      } catch {
        /* keep the default */
      }

      // Google users still need DOB + the 18+ confirmation (spec §8 A1).
      const next = user.isAdultConfirmed ? returnTo : '/complete-signup'
      const url = new URL(`${env.CLIENT_URL}/auth/callback`)
      url.searchParams.set('token', accessToken)
      url.searchParams.set('next', next)
      res.redirect(url.toString())
    }
  )
} else {
  authRouter.get('/google', (_req, res) => {
    res.status(503).json({ error: 'Google sign-in is not configured yet.' })
  })
}
