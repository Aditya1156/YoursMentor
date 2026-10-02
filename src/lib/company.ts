/**
 * A stable look for a company from its name alone.
 *
 * Real company logos were the obvious thing here and are the wrong thing. A
 * recruiter's trademark on our card implies a relationship we do not have, and
 * every third-party logo service means an external request per mentor — nine
 * on a directory page — which both costs a student data and tells that service
 * who they are browsing. Spec §2 rules out tracking scripts for the same
 * reason.
 *
 * So each company gets a monogram in a colour derived from its own name. It is
 * deterministic, so PhonePe looks the same on every card and in every session;
 * it costs nothing to load; and it gives the directory the variety a wall of
 * identical cards was missing.
 *
 * The palette is brand-adjacent on purpose. Arbitrary hues would fight the
 * blue the rest of the product is built on, and amber is excluded entirely —
 * it means a ₹99 group seat everywhere else and must not start meaning
 * "works at Swiggy".
 */
const TONES = [
  { bg: '#E8F2FE', fg: '#0042AC', band: 'rgb(0 105 238 / 0.10)' },   // brand blue
  { bg: '#E4F4FB', fg: '#055E80', band: 'rgb(5 150 200 / 0.10)' },   // cyan
  { bg: '#E7F3EE', fg: '#13613D', band: 'rgb(26 122 67 / 0.10)' },   // green
  { bg: '#EDEBFA', fg: '#3F2E9E', band: 'rgb(79 60 190 / 0.10)' },   // indigo
  { bg: '#F6EAF4', fg: '#7A2C66', band: 'rgb(150 60 130 / 0.10)' },  // plum
  { bg: '#EAEEF6', fg: '#334366', band: 'rgb(51 67 102 / 0.10)' },   // slate
  { bg: '#E6F1F3', fg: '#0F5A63', band: 'rgb(15 110 120 / 0.10)' },  // teal
] as const

export type CompanyTone = (typeof TONES)[number]

/** FNV-1a. Small, stable across runtimes, and good enough to spread names. */
function hash(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function companyTone(name: string | undefined): CompanyTone {
  if (!name) return TONES[5]!
  return TONES[hash(name.trim().toLowerCase()) % TONES.length]!
}

/** "PhonePe" -> "P", "TU Munich" -> "TM", "Big 4" -> "B4". */
export function companyMonogram(name: string | undefined): string {
  if (!name) return '·'
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 1) {
    const w = words[0]!
    // Split an internal capital, so PhonePe reads P rather than PH.
    return w.slice(0, 1).toUpperCase()
  }
  return words.slice(0, 2).map((w) => w[0]!.toUpperCase()).join('')
}
