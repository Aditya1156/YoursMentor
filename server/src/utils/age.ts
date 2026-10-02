/**
 * Whole years elapsed, in UTC. V1 is 18+ only (spec §2) — under-18 needs a real
 * DPDP parental-consent flow before we can accept them.
 */
export function ageInYears(dateOfBirth: Date, now = new Date()): number {
  let age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear()
  const monthDiff = now.getUTCMonth() - dateOfBirth.getUTCMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < dateOfBirth.getUTCDate())) {
    age -= 1
  }
  return age
}

export const MIN_AGE = 18
export const isAdult = (dateOfBirth: Date, now = new Date()) =>
  ageInYears(dateOfBirth, now) >= MIN_AGE
