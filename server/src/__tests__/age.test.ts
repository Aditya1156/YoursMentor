import { describe, expect, it } from 'vitest'
import { ageInYears, isAdult } from '../utils/age.js'

const NOW = new Date('2026-10-02T00:00:00Z')

describe('ageInYears', () => {
  it('counts whole years', () => {
    expect(ageInYears(new Date('2000-10-02T00:00:00Z'), NOW)).toBe(26)
  })

  it('does not count a birthday that has not happened yet this year', () => {
    expect(ageInYears(new Date('2008-10-03T00:00:00Z'), NOW)).toBe(17)
  })

  it('counts the birthday itself', () => {
    expect(ageInYears(new Date('2008-10-02T00:00:00Z'), NOW)).toBe(18)
  })

  it('handles a birthday earlier in the same month', () => {
    expect(ageInYears(new Date('2008-10-01T00:00:00Z'), NOW)).toBe(18)
  })

  it('handles a 29 February birthday', () => {
    expect(ageInYears(new Date('2008-02-29T00:00:00Z'), NOW)).toBe(18)
  })
})

describe('isAdult — V1 is 18+ only', () => {
  it('accepts someone who turned 18 today', () => {
    expect(isAdult(new Date('2008-10-02T00:00:00Z'), NOW)).toBe(true)
  })

  it('rejects someone one day short of 18', () => {
    expect(isAdult(new Date('2008-10-03T00:00:00Z'), NOW)).toBe(false)
  })

  it('rejects a clearly under-age date', () => {
    expect(isAdult(new Date('2014-01-01T00:00:00Z'), NOW)).toBe(false)
  })
})
