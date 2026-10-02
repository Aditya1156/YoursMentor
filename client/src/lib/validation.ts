import { z } from 'zod'

/**
 * Mirrors server/src/schemas/auth.schema.ts — change both together.
 * The server is the authority; this exists so the form can fail fast.
 */

export const MIN_AGE = 18

export const emailField = z
  .string()
  .trim()
  .min(1, 'Enter your email address.')
  .email('Enter a valid email address.')

export const passwordField = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(128, 'That password is too long.')

function isAdult(value: string) {
  const dob = new Date(value)
  if (Number.isNaN(dob.getTime())) return false
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const m = now.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1
  return age >= MIN_AGE
}

export const dateOfBirthField = z
  .string()
  .min(1, 'Enter your date of birth.')
  .refine((v) => !Number.isNaN(new Date(v).getTime()), 'Enter a valid date.')
  .refine((v) => new Date(v) <= new Date(), 'That date is in the future.')
  .refine(isAdult, "We're only open to 18+ right now.")

export const signupFormSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(80),
  email: emailField,
  password: passwordField,
  dateOfBirth: dateOfBirthField,
  isAdultConfirmed: z.literal(true, {
    errorMap: () => ({ message: 'Please confirm you are 18 or older.' }),
  }),
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: 'Please accept the Terms and Privacy Policy.' }),
  }),
})

export const loginFormSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Enter your password.'),
})

export const forgotPasswordFormSchema = z.object({ email: emailField })

export const resetPasswordFormSchema = z
  .object({
    password: passwordField,
    confirmPassword: z.string().min(1, 'Type your password again.'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Those passwords do not match.',
  })

export const completeSignupFormSchema = z.object({
  dateOfBirth: dateOfBirthField,
  isAdultConfirmed: z.literal(true, {
    errorMap: () => ({ message: 'Please confirm you are 18 or older.' }),
  }),
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: 'Please accept the Terms and Privacy Policy.' }),
  }),
})

export type SignupForm = z.infer<typeof signupFormSchema>
export type LoginForm = z.infer<typeof loginFormSchema>
export type ResetPasswordForm = z.infer<typeof resetPasswordFormSchema>
