import { describe, expect, it } from 'vitest'
import { isAfterglowDay } from './afterglow'
import type { GardenFlower } from '../domain/progress/garden'

const SPECIES = { id: 'pink-bloom', name: 'Pink Bloom', rarity: 'common', petal: '#fff', petalDark: '#fff', center: '#fff', centerDark: '#fff' } as const

function flower(endedAt: string): GardenFlower {
  return { sessionId: `s-${endedAt}`, endedAt, species: SPECIES }
}

function at(hour: number, minute = 0): Date {
  return new Date(2026, 9, 1, hour, minute, 0) // Oct 1, 2026 (local)
}

describe('isAfterglowDay', () => {
  it('is false for an empty garden', () => {
    expect(isAfterglowDay([], at(12))).toBe(false)
  })

  it('is true when the newest flower ended earlier today', () => {
    const flowers = [flower(new Date(2026, 9, 1, 7, 30).toISOString())]
    expect(isAfterglowDay(flowers, at(20))).toBe(true)
  })

  it('is true right after finishing, same minute', () => {
    const now = at(9, 15)
    const flowers = [flower(now.toISOString())]
    expect(isAfterglowDay(flowers, now)).toBe(true)
  })

  it('is false when the newest flower ended yesterday', () => {
    const flowers = [flower(new Date(2026, 8, 30, 23, 59).toISOString())]
    expect(isAfterglowDay(flowers, at(0, 1))).toBe(false)
  })

  it('is false when the newest flower ended tomorrow (clock skew guard)', () => {
    const flowers = [flower(new Date(2026, 9, 2, 0, 1).toISOString())]
    expect(isAfterglowDay(flowers, at(23, 59))).toBe(false)
  })

  it('only looks at the newest flower, not older ones from earlier days', () => {
    const flowers = [flower(new Date(2026, 9, 1, 8, 0).toISOString()), flower(new Date(2026, 9, 2, 8, 0).toISOString())]
    // "now" is still Oct 1 - the newest flower (Oct 2) hasn't happened from
    // today's point of view in a real app, but the function trusts its
    // input: the last element is always treated as newest, per raeRoom.ts.
    expect(isAfterglowDay(flowers, at(9))).toBe(false)
  })

  it('crosses midnight correctly: just after midnight is not the same day as just before', () => {
    const flowers = [flower(new Date(2026, 9, 1, 23, 58).toISOString())]
    expect(isAfterglowDay(flowers, new Date(2026, 9, 2, 0, 2))).toBe(false)
    expect(isAfterglowDay(flowers, new Date(2026, 9, 1, 23, 59))).toBe(true)
  })

  it('is false for an unparseable endedAt rather than throwing', () => {
    const flowers = [flower('not-a-date')]
    expect(isAfterglowDay(flowers, at(12))).toBe(false)
  })
})
