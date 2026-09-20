import { describe, expect, it } from 'vitest'
import { effectiveMotion } from './MovementMedia'

describe('effectiveMotion', () => {
  it('lets the OS reduce-motion preference downgrade "full" to "reduced"', () => {
    expect(effectiveMotion('full', true)).toBe('reduced')
  })

  it('keeps "full" when the OS has no preference', () => {
    expect(effectiveMotion('full', false)).toBe('full')
  })

  it('never overrides an explicit app-level reduced/off', () => {
    expect(effectiveMotion('reduced', false)).toBe('reduced')
    expect(effectiveMotion('off', true)).toBe('off')
  })
})
