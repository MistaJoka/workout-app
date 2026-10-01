import { describe, expect, it } from 'vitest'
import { hasHypeQueryFlag, hypeSchedule, hypeTotalMs } from './HypeCountdown'

describe('hypeSchedule', () => {
  it('shows four beats (3, 2, 1, go) under full and reduced motion', () => {
    expect(hypeSchedule('full').map((s) => s.phase)).toEqual(['3', '2', '1', 'go'])
    expect(hypeSchedule('reduced').map((s) => s.phase)).toEqual(['3', '2', '1', 'go'])
  })

  it('skips the numbers under off motion, keeping only the final beat', () => {
    expect(hypeSchedule('off').map((s) => s.phase)).toEqual(['go'])
  })

  it('totals about 2.2s for full/reduced and a short ~0.8s for off', () => {
    expect(hypeTotalMs('full')).toBe(2200)
    expect(hypeTotalMs('reduced')).toBe(2200)
    expect(hypeTotalMs('off')).toBe(800)
    expect(hypeTotalMs('full')).toBeLessThan(2500)
  })
})

describe('hasHypeQueryFlag', () => {
  it('reads ?hype=1 from a query string', () => {
    expect(hasHypeQueryFlag('?hype=1')).toBe(true)
    expect(hasHypeQueryFlag('?hype=1&foo=bar')).toBe(true)
  })

  it('is false for anything else, including no query at all', () => {
    expect(hasHypeQueryFlag('')).toBe(false)
    expect(hasHypeQueryFlag('?hype=0')).toBe(false)
    expect(hasHypeQueryFlag('?other=1')).toBe(false)
  })
})
