import { describe, expect, it } from 'vitest'
import { isRestComplete, remainingRestMs } from './restTimer'

describe('remainingRestMs', () => {
  it('returns the exact remaining milliseconds before restEndsAt', () => {
    const restEndsAt = '2026-09-13T00:02:00.000Z'
    const now = () => new Date('2026-09-13T00:01:30.000Z').getTime()
    expect(remainingRestMs(restEndsAt, now)).toBe(30000)
  })

  it('never returns a negative value once restEndsAt has passed', () => {
    const restEndsAt = '2026-09-13T00:02:00.000Z'
    const now = () => new Date('2026-09-13T00:05:00.000Z').getTime()
    expect(remainingRestMs(restEndsAt, now)).toBe(0)
  })

  it('is computed from the fixed restEndsAt timestamp, not a decrementing counter — repeated calls with an advancing clock produce consistent absolute results', () => {
    const restEndsAt = '2026-09-13T00:02:00.000Z'
    const tick1 = remainingRestMs(restEndsAt, () => new Date('2026-09-13T00:01:00.000Z').getTime())
    const tick2 = remainingRestMs(restEndsAt, () => new Date('2026-09-13T00:01:50.000Z').getTime())
    expect(tick1 - tick2).toBe(50000)
  })
})

describe('isRestComplete', () => {
  it('is false while time remains', () => {
    const restEndsAt = '2026-09-13T00:02:00.000Z'
    const now = () => new Date('2026-09-13T00:01:00.000Z').getTime()
    expect(isRestComplete(restEndsAt, now)).toBe(false)
  })

  it('is true once restEndsAt has passed', () => {
    const restEndsAt = '2026-09-13T00:02:00.000Z'
    const now = () => new Date('2026-09-13T00:02:00.001Z').getTime()
    expect(isRestComplete(restEndsAt, now)).toBe(true)
  })

  it('is true exactly at restEndsAt', () => {
    const restEndsAt = '2026-09-13T00:02:00.000Z'
    const now = () => new Date('2026-09-13T00:02:00.000Z').getTime()
    expect(isRestComplete(restEndsAt, now)).toBe(true)
  })
})
