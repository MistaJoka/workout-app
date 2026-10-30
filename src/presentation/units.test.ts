import { describe, expect, it } from 'vitest'
import {
  carrots,
  cmToUnit,
  defaultWeightUnitForLocale,
  formatLength,
  formatWeight,
  kgToUnit,
  lengthUnitFor,
  roundToStep,
  unitToCm,
  unitToKg,
} from './units'

describe('length units follow the weight setting', () => {
  it('lb shows inches, kg shows centimeters', () => {
    expect(lengthUnitFor('lb')).toBe('in')
    expect(lengthUnitFor('kg')).toBe('cm')
  })

  it('converts and round-trips cm through inches', () => {
    expect(cmToUnit(2.54, 'in')).toBeCloseTo(1, 6)
    expect(unitToCm(cmToUnit(81.3, 'in'), 'in')).toBeCloseTo(81.3, 6)
    expect(cmToUnit(80, 'cm')).toBe(80)
  })

  it('formats with at most one decimal', () => {
    expect(formatLength(80, 'cm')).toBe('80 cm')
    expect(formatLength(81.28, 'in')).toBe('32 in')
    expect(formatLength(80, 'in')).toBe('31.5 in')
  })
})

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

describe('carrots', () => {
  it('groups thousands so a mega prize reads 1,000, not 1000', () => {
    expect(carrots(25)).toBe('25')
    expect(carrots(1000)).toBe('1,000')
    expect(carrots(12500)).toBe('12,500')
  })
})
