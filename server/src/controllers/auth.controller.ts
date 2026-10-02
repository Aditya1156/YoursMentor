import type { Request, Response } from 'express'
import { User, toPublicUser } from '../models/user.model.js'
import * as auth from '../services/auth.service.js'
import { asyncHandler, unauthorized } from '../utils/errors.js'
import { verifyRefreshToken } from '../utils/tokens.js'

export const signup = asyncHandler(async (req: Request, res: Response) => {
  const user = await auth.signup(req.body)
  res.status(201).json({
    ...auth.issueSession(res, user, user.tokenVersion ?? 0),
    message: 'Check your inbox to confirm your email address.',
  })
})

export const login = asyncHandler(async (req: Request, res: Response) => {
  const user = await auth.login(req.body.email, req.body.password)
  res.json(auth.issueSession(res, user, user.tokenVersion ?? 0))
})

/**
 * Rotates the pair from the httpOnly cookie. `tokenVersion` is re-read from the
 * database so a password reset or logout-all immediately kills old refreshes.
 */
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = auth.readRefreshCookie(req.cookies)
  if (!token) throw unauthorized('Please sign in again.')

  let payload
  try {
    payload = verifyRefreshToken(token)
  } catch {
    auth.clearRefreshCookie(res)
    throw unauthorized('Please sign in again.')
  }

  const user = await User.findById(payload.sub).select('+tokenVersion')
  if (!user || user.status === 'suspended' || (user.tokenVersion ?? 0) !== payload.ver) {
    auth.clearRefreshCookie(res)
    throw unauthorized('Please sign in again.')
  }

  res.json(auth.issueSession(res, user, user.tokenVersion ?? 0))
})

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  auth.clearRefreshCookie(res)
  res.json({ ok: true })
})

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.auth!.sub)
  if (!user) throw unauthorized()
  res.json({ user: toPublicUser(user) })
})

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const user = await auth.verifyEmail(req.body.token)
  res.json({ user: toPublicUser(user), message: 'Your email is confirmed.' })
})

export const resendVerification = asyncHandler(async (req: Request, res: Response) => {
  await auth.resendVerification(req.body.email)
  res.json({ message: 'If that account needs confirming, we have sent a new link.' })
})

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  await auth.forgotPassword(req.body.email)
  res.json({ message: 'If that email is registered, a reset link is on its way.' })
})

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const user = await auth.resetPassword(req.body.token, req.body.password)
  res.json(auth.issueSession(res, user, user.tokenVersion ?? 0))
})

export const completeGoogleSignup = asyncHandler(async (req: Request, res: Response) => {
  const user = await auth.completeGoogleSignup(req.auth!.sub, req.body.dateOfBirth)
  res.json({ user: toPublicUser(user) })
})
