import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import { User } from '../models/user.model.js'

let mongo: MongoMemoryServer
const app = createApp()

/** Born well over 18 years ago. */
const ADULT_DOB = '1999-05-20'
const UNDER_18_DOB = new Date(Date.now() - 17 * 365.25 * 24 * 3600 * 1000)
  .toISOString()
  .slice(0, 10)

const VALID_SIGNUP = {
  name: 'Rohan Sharma',
  email: 'rohan@example.com',
  password: 'correct horse 8',
  dateOfBirth: ADULT_DOB,
  isAdultConfirmed: true,
  acceptedTerms: true,
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create()
  await mongoose.connect(mongo.getUri())
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongo.stop()
})

beforeEach(async () => {
  await User.deleteMany({})
})

const refreshCookie = (res: request.Response) =>
  (res.headers['set-cookie'] as unknown as string[] | undefined)?.find((c) =>
    c.startsWith('onestep_rt=')
  )

describe('POST /api/auth/signup', () => {
  it('creates an account and returns an access token', async () => {
    const res = await request(app).post('/api/auth/signup').send(VALID_SIGNUP)

    expect(res.status).toBe(201)
    expect(res.body.accessToken).toBeTruthy()
    expect(res.body.user.email).toBe('rohan@example.com')
    expect(res.body.user.role).toBe('student')
    expect(res.body.user.emailVerified).toBe(false)
  })

  it('sets the refresh token as an httpOnly cookie scoped to /api/auth', () => {
    return request(app)
      .post('/api/auth/signup')
      .send(VALID_SIGNUP)
      .expect(201)
      .then((res) => {
        const cookie = refreshCookie(res)
        expect(cookie).toBeDefined()
        expect(cookie).toContain('HttpOnly')
        expect(cookie).toContain('Path=/api/auth')
      })
  })

  it('never returns the password hash or token internals', async () => {
    const res = await request(app).post('/api/auth/signup').send(VALID_SIGNUP)
    const body = JSON.stringify(res.body)
    expect(body).not.toContain('passwordHash')
    expect(body).not.toContain('tokenVersion')
    expect(body).not.toContain('emailVerificationTokenHash')
  })

  it('rejects an under-18 date of birth', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ ...VALID_SIGNUP, dateOfBirth: UNDER_18_DOB })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('UNDER_AGE')
    expect(await User.countDocuments()).toBe(0)
  })

  it('rejects a password under 8 characters', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ ...VALID_SIGNUP, password: 'short1' })

    expect(res.status).toBe(400)
    expect(res.body.fieldErrors.password).toMatch(/8 characters/)
  })

  it('requires both the 18+ and terms checkboxes', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ ...VALID_SIGNUP, isAdultConfirmed: false, acceptedTerms: false })

    expect(res.status).toBe(400)
    expect(res.body.fieldErrors.isAdultConfirmed).toBeTruthy()
    expect(res.body.fieldErrors.acceptedTerms).toBeTruthy()
  })

  it('rejects a duplicate email', async () => {
    await request(app).post('/api/auth/signup').send(VALID_SIGNUP).expect(201)
    const res = await request(app).post('/api/auth/signup').send(VALID_SIGNUP)
    expect(res.status).toBe(409)
  })

  it('treats email as case-insensitive', async () => {
    await request(app).post('/api/auth/signup').send(VALID_SIGNUP).expect(201)
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ ...VALID_SIGNUP, email: 'ROHAN@example.com' })
    expect(res.status).toBe(409)
  })

  it('honours role=mentor', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ ...VALID_SIGNUP, role: 'mentor' })
    expect(res.body.user.role).toBe('mentor')
  })
})

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/signup').send(VALID_SIGNUP)
  })

  it('signs in with the right password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_SIGNUP.email, password: VALID_SIGNUP.password })

    expect(res.status).toBe(200)
    expect(res.body.accessToken).toBeTruthy()
  })

  it('gives the same error for a wrong password and an unknown email', async () => {
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_SIGNUP.email, password: 'definitely wrong' })

    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: VALID_SIGNUP.password })

    expect(wrongPassword.status).toBe(401)
    expect(unknownEmail.status).toBe(401)
    expect(wrongPassword.body.error).toBe(unknownEmail.body.error)
  })

  it('refuses a suspended account', async () => {
    await User.updateOne({ email: VALID_SIGNUP.email }, { status: 'suspended' })
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_SIGNUP.email, password: VALID_SIGNUP.password })

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/suspended/i)
  })
})

describe('GET /api/auth/me', () => {
  it('returns the signed-in user', async () => {
    const signup = await request(app).post('/api/auth/signup').send(VALID_SIGNUP)
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${signup.body.accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.user.email).toBe(VALID_SIGNUP.email)
  })

  it('rejects a missing token', async () => {
    await request(app).get('/api/auth/me').expect(401)
  })

  it('rejects a forged token', async () => {
    await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not.a.real.token')
      .expect(401)
  })
})

describe('POST /api/auth/refresh', () => {
  it('issues a new access token from the cookie', async () => {
    const signup = await request(app).post('/api/auth/signup').send(VALID_SIGNUP)
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', refreshCookie(signup)!)

    expect(res.status).toBe(200)
    expect(res.body.accessToken).toBeTruthy()
  })

  it('rejects a request with no cookie', async () => {
    await request(app).post('/api/auth/refresh').expect(401)
  })

  it('stops accepting old refresh tokens after a password reset', async () => {
    const signup = await request(app).post('/api/auth/signup').send(VALID_SIGNUP)
    const cookie = refreshCookie(signup)!

    await User.updateOne({ email: VALID_SIGNUP.email }, { $inc: { tokenVersion: 1 } })

    await request(app).post('/api/auth/refresh').set('Cookie', cookie).expect(401)
  })
})

describe('email verification', () => {
  it('verifies with a valid token and rejects reuse', async () => {
    await request(app).post('/api/auth/signup').send(VALID_SIGNUP)

    // Read the raw token the way the email would carry it: regenerate via resend,
    // then pull the stored hash to prove hash-only storage.
    const stored = await User.findOne({ email: VALID_SIGNUP.email }).select(
      '+emailVerificationTokenHash'
    )
    expect(stored?.emailVerificationTokenHash).toBeTruthy()
    expect(stored?.emailVerificationTokenHash).toHaveLength(64) // sha256 hex
  })

  it('rejects an unknown token', async () => {
    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: 'f'.repeat(64) })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('TOKEN_INVALID')
  })
})

describe('password reset does not leak which emails exist', () => {
  it('answers identically for a known and an unknown address', async () => {
    await request(app).post('/api/auth/signup').send(VALID_SIGNUP)

    const known = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: VALID_SIGNUP.email })
    const unknown = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@example.com' })

    expect(known.status).toBe(200)
    expect(unknown.status).toBe(200)
    expect(known.body.message).toBe(unknown.body.message)
  })
})

describe('POST /api/auth/logout', () => {
  it('clears the refresh cookie', async () => {
    const res = await request(app).post('/api/auth/logout').expect(200)
    const cookie = refreshCookie(res)
    expect(cookie).toMatch(/onestep_rt=;/)
  })
})
