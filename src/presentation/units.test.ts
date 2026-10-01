import { describe, expect, it } from 'vitest'
import { defaultWeightUnitForLocale, formatWeight, kgToUnit, roundToStep, unitToKg } from './units'

describe('units', () => {
  it('round-trips kg through lb within rounding', () => {
    expect(unitToKg(kgToUnit(40, 'lb'), 'lb')).toBeCloseTo(40, 6)
  })

  it('formats whole numbers without decimals and others with one decimal', () => {
    expect(formatWeight(40, 'kg')).toBe('40 kg')
    expect(formatWeight(42.5, 'kg')).toBe('42.5 kg')
    expect(formatWeight(40, 'lb')).toBe('88.2 lb')
  })

  it('rounds to the plate step for the unit', () => {
    expect(roundToStep(88.18, 'lb')).toBe(90)
    expect(roundToStep(41, 'kg')).toBe(40)
  })
})

describe('defaultWeightUnitForLocale', () => {
  it('defaults en-US to lb', () => {
    expect(defaultWeightUnitForLocale('en-US')).toBe('lb')
  })

  it('defaults every other locale to kg', () => {
    expect(defaultWeightUnitForLocale('en-GB')).toBe('kg')
    expect(defaultWeightUnitForLocale('fr-FR')).toBe('kg')
    expect(defaultWeightUnitForLocale(undefined)).toBe('kg')
  })
})
