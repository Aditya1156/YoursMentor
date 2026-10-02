import bcrypt from 'bcryptjs'
import type { Response } from 'express'
import { User, toPublicUser, type UserDoc } from '../models/user.model.js'
import { isAdult } from '../utils/age.js'
import {
  REFRESH_TOKEN_TTL_DAYS,
  createOneTimeToken,
  hashToken,
  signAccessToken,
  signRefreshToken,
} from '../utils/tokens.js'
import { badRequest, conflict, unauthorized } from '../utils/errors.js'
import { isProd } from '../config/env.js'
import { sendPasswordResetEmail, sendVerificationEmail } from './email.service.js'

const BCRYPT_ROUNDS = 12
const REFRESH_COOKIE = 'onestep_rt'
const VERIFY_TTL_MIN = 60 * 24 // 24 hours
const RESET_TTL_MIN = 60 // 1 hour

export const hashPassword = (plain: string) => bcrypt.hash(plain, BCRYPT_ROUNDS)

export function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/api/auth',
    maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  })
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' })
}

export const readRefreshCookie = (cookies: Record<string, string> | undefined) =>
  cookies?.[REFRESH_COOKIE]

/** Issues the pair and sets the cookie. Access token goes to the client in JSON. */
export function issueSession(res: Response, user: UserDoc, tokenVersion: number) {
  const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role })
  setRefreshCookie(res, signRefreshToken({ sub: user._id.toString(), ver: tokenVersion }))
  return { accessToken, user: toPublicUser(user) }
}

export async function signup(input: {
  name: string
  email: string
  password: string
  dateOfBirth: Date
  role: 'student' | 'mentor'
}) {
  if (!isAdult(input.dateOfBirth)) {
    throw badRequest("We're only open to 18+ right now.", 'UNDER_AGE')
  }

  const existing = await User.findOne({ email: input.email }).lean()
  if (existing) {
    throw conflict('That email is already registered. Try signing in instead.', 'EMAIL_TAKEN')
  }

  const verification = createOneTimeToken(VERIFY_TTL_MIN)
  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    dateOfBirth: input.dateOfBirth,
    isAdultConfirmed: true,
    role: input.role,
    emailVerificationTokenHash: verification.hash,
    emailVerificationExpiresAt: verification.expiresAt,
  })

  await sendVerificationEmail(user.email, user.name, verification.raw)
  return user
}

export async function login(email: string, password: string) {
  const user = await User.findOne({ email }).select('+passwordHash +tokenVersion')
  // Same message either way — never reveal whether an email is registered.
  const invalid = unauthorized('That email or password is not right.')
  if (!user?.passwordHash) throw invalid
  if (!(await bcrypt.compare(password, user.passwordHash))) throw invalid
  if (user.status === 'suspended') {
    throw unauthorized('This account is suspended. Contact support@onestep.in.')
  }
  return user
}

export async function verifyEmail(rawToken: string) {
  const user = await User.findOne({
    emailVerificationTokenHash: hashToken(rawToken),
    emailVerificationExpiresAt: { $gt: new Date() },
  }).select('+emailVerificationTokenHash +emailVerificationExpiresAt')

  if (!user) throw badRequest('That link has expired or has already been used.', 'TOKEN_INVALID')

  user.emailVerified = true
  user.emailVerificationTokenHash = undefined
  user.emailVerificationExpiresAt = undefined
  await user.save()
  return user
}

export async function resendVerification(email: string) {
  const user = await User.findOne({ email })
  // Silent no-op for unknown or already-verified addresses — no enumeration.
  if (!user || user.emailVerified) return
  const verification = createOneTimeToken(VERIFY_TTL_MIN)
  user.emailVerificationTokenHash = verification.hash
  user.emailVerificationExpiresAt = verification.expiresAt
  await user.save()
  await sendVerificationEmail(user.email, user.name, verification.raw)
}

export async function forgotPassword(email: string) {
  const user = await User.findOne({ email })
  if (!user) return // same silent no-op
  const reset = createOneTimeToken(RESET_TTL_MIN)
  user.passwordResetTokenHash = reset.hash
  user.passwordResetExpiresAt = reset.expiresAt
  await user.save()
  await sendPasswordResetEmail(user.email, user.name, reset.raw)
}

export async function resetPassword(rawToken: string, password: string) {
  const user = await User.findOne({
    passwordResetTokenHash: hashToken(rawToken),
    passwordResetExpiresAt: { $gt: new Date() },
  }).select('+passwordResetTokenHash +passwordResetExpiresAt +tokenVersion')

  if (!user) throw badRequest('That link has expired or has already been used.', 'TOKEN_INVALID')

  user.passwordHash = await hashPassword(password)
  user.passwordResetTokenHash = undefined
  user.passwordResetExpiresAt = undefined
  // Signs out every other device.
  user.tokenVersion = (user.tokenVersion ?? 0) + 1
  await user.save()
  return user
}

/** Finds or creates the account behind a verified Google profile. */
export async function upsertGoogleUser(profile: {
  googleId: string
  email: string
  name: string
  avatarUrl?: string
}) {
  const byGoogleId = await User.findOne({ googleId: profile.googleId }).select('+tokenVersion')
  if (byGoogleId) return byGoogleId

  const byEmail = await User.findOne({ email: profile.email }).select('+tokenVersion')
  if (byEmail) {
    // Link the Google identity to the existing password account.
    byEmail.googleId = profile.googleId
    byEmail.avatarUrl ??= profile.avatarUrl
    byEmail.emailVerified = true // Google has already verified it
    await byEmail.save()
    return byEmail
  }

  return User.create({
    googleId: profile.googleId,
    email: profile.email,
    name: profile.name,
    avatarUrl: profile.avatarUrl,
    emailVerified: true,
    // DOB and the 18+ confirmation are collected on the next screen.
    isAdultConfirmed: false,
  })
}

export async function completeGoogleSignup(userId: string, dateOfBirth: Date) {
  if (!isAdult(dateOfBirth)) {
    throw badRequest("We're only open to 18+ right now.", 'UNDER_AGE')
  }
  const user = await User.findById(userId).select('+tokenVersion')
  if (!user) throw unauthorized()
  user.dateOfBirth = dateOfBirth
  user.isAdultConfirmed = true
  await user.save()
  return user
}
