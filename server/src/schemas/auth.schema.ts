import { z } from 'zod'

/**
 * These rules are mirrored in client/src/lib/validation.ts — change both
 * together. (A shared workspace would remove the duplication; not worth the
 * build complexity at V1 size.)
 */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address.')

export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(128, 'That password is too long.')

export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(80),
  email: emailSchema,
  password: passwordSchema,
  dateOfBirth: z.coerce.date({ invalid_type_error: 'Enter your date of birth.' }),
  isAdultConfirmed: z.literal(true, {
    errorMap: () => ({ message: 'You must confirm you are 18 or older.' }),
  }),
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: 'Please accept the Terms and Privacy Policy.' }),
  }),
  role: z.enum(['student', 'mentor']).default('student'),
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.'),
})

export const verifyEmailSchema = z.object({ token: z.string().min(1) })
export const resendVerificationSchema = z.object({ email: emailSchema })
export const forgotPasswordSchema = z.object({ email: emailSchema })
export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
})

/** Google sign-in leaves DOB unknown — collected on the next screen. */
export const completeGoogleSignupSchema = z.object({
  dateOfBirth: z.coerce.date(),
  isAdultConfirmed: z.literal(true),
  acceptedTerms: z.literal(true),
})

export type SignupInput = z.infer<typeof signupSchema>
export type LoginInput = z.infer<typeof loginSchema>
