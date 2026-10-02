import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { env } from '../config/env.js'
import { upsertGoogleUser } from './auth.service.js'

export const googleEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)

if (googleEnabled) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID!,
        clientSecret: env.GOOGLE_CLIENT_SECRET!,
        callbackURL: '/api/auth/google/callback',
        scope: ['profile', 'email'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value
          if (!email) {
            return done(null, false, { message: 'Google did not share an email address.' })
          }
          const user = await upsertGoogleUser({
            googleId: profile.id,
            email: email.toLowerCase(),
            name: profile.displayName || email.split('@')[0]!,
            avatarUrl: profile.photos?.[0]?.value,
          })
          done(null, user)
        } catch (err) {
          done(err as Error)
        }
      }
    )
  )
}

export { passport }
