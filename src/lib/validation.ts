import { z } from 'zod'

/**
 * Form validation. The database is the real authority — `adult_needs_dob` on
 * public.profiles rejects an under-18 row no matter what the form allowed.
 * These schemas exist so the user hears about it before a round trip.
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

export function ageInYears(value: string, now = new Date()): number | null {
  const dob = new Date(value)
  if (Number.isNaN(dob.getTime())) return null
  let age = now.getFullYear() - dob.getFullYear()
  const monthDiff = now.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age -= 1
  return age
}

export const dateOfBirthField = z
  .string()
  .min(1, 'Enter your date of birth.')
  .refine((v) => !Number.isNaN(new Date(v).getTime()), 'Enter a valid date.')
  .refine((v) => new Date(v) <= new Date(), 'That date is in the future.')
  .refine((v) => (ageInYears(v) ?? -1) >= MIN_AGE, "We're only open to 18+ right now.")

const mustBeChecked = (message: string) =>
  z.boolean().refine((v) => v === true, { message })

export const signupFormSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(80, 'That name is too long.'),
  email: emailField,
  password: passwordField,
  dateOfBirth: dateOfBirthField,
  isAdultConfirmed: mustBeChecked('Please confirm you are 18 or older.'),
  acceptedTerms: mustBeChecked('Please accept the Terms and Privacy Policy.'),
})

export const completeProfileSchema = z.object({
  dateOfBirth: dateOfBirthField,
  isAdultConfirmed: mustBeChecked('Please confirm you are 18 or older.'),
  acceptedTerms: mustBeChecked('Please accept the Terms and Privacy Policy.'),
})

export type SignupForm = z.infer<typeof signupFormSchema>
