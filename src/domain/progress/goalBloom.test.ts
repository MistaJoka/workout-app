import { describe, expect, it } from 'vitest'
import { GARDEN_SPECIES } from './garden'
import { goalBloomForSession, goalBlooms, goalSpeciesFor, weekStartKey } from './goalBloom'
import type { SessionResult } from '../session/types'

function result(sessionId: string, endedAt: string): SessionResult {
  return { sessionId, planId: sessionId, status: 'COMPLETED', startedAt: endedAt, endedAt, totalSetsCompleted: 1, totalSetsPlanned: 1 }
}

describe('weekStartKey', () => {
  it('is the local Monday of the week, for any day of that week', () => {
    // 2026-09-28 is a Monday.
    expect(weekStartKey(new Date(2026, 8, 28))).toBe('2026-09-28')
    expect(weekStartKey(new Date(2026, 8, 30))).toBe('2026-09-28') // Wednesday
    expect(weekStartKey(new Date(2026, 9, 4))).toBe('2026-09-28') // Sunday
    expect(weekStartKey(new Date(2026, 9, 5))).toBe('2026-10-05') // next Monday
  })
})

describe('goalSpeciesFor', () => {
  it('only ever draws from the uncommon/rare/legendary pool, never common', () => {
    for (let i = 0; i < 2000; i++) {
      const species = goalSpeciesFor(`2026-0${(i % 9) + 1}-0${(i % 9) + 1}`)
      expect(species.rarity).not.toBe('common')
    }
  })

  it('is deterministic by weekStart alone', () => {
    expect(goalSpeciesFor('2026-09-28')).toEqual(goalSpeciesFor('2026-09-28'))
  })

  it('rarities land near 70/25/5 over many weeks', () => {
    const n = 20000
    const tally = { uncommon: 0, rare: 0, legendary: 0 }
    for (let i = 0; i < n; i++) {
      const key = `week-${i}-${(i * 2654435761) % 1000003}`
      const rarity = goalSpeciesFor(key).rarity as 'uncommon' | 'rare' | 'legendary'
      tally[rarity] += 1
    }
    expect(tally.uncommon / n).toBeGreaterThan(0.65)
    expect(tally.uncommon / n).toBeLessThan(0.75)
    expect(tally.rare / n).toBeGreaterThan(0.21)
    expect(tally.rare / n).toBeLessThan(0.29)
    expect(tally.legendary / n).toBeGreaterThan(0.02)
    expect(tally.legendary / n).toBeLessThan(0.08)
  })
})

describe('goalBlooms', () => {
  it('grows one bonus bloom on the session that reaches the weekly goal, never before', () => {
    const results = [
      result('s1', '2026-09-28T10:00:00.000Z'), // Monday
      result('s2', '2026-09-30T10:00:00.000Z'), // Wednesday, same week: reaches goal 2
      result('s3', '2026-10-01T10:00:00.000Z'), // Thursday, still same week: goal already met
    ]
    const blooms = goalBlooms(results, 2)
    expect(blooms).toHaveLength(1)
    expect(blooms[0].sessionId).toBe('s2')
    expect(blooms[0].weekStart).toBe('2026-09-28')
    expect(blooms[0].species.rarity).not.toBe('common')
  })

  it('grows one bloom per week that met the goal, independently', () => {
    const results = [
      result('s1', '2026-09-28T10:00:00.000Z'),
      result('s2', '2026-09-29T10:00:00.000Z'), // week 1 met
      result('s3', '2026-10-05T10:00:00.000Z'),
      result('s4', '2026-10-06T10:00:00.000Z'), // week 2 met
    ]
    const blooms = goalBlooms(results, 2)
    expect(blooms.map((b) => b.sessionId)).toEqual(['s2', 's4'])
    expect(blooms.map((b) => b.weekStart)).toEqual(['2026-09-28', '2026-10-05'])
  })

  it('never grows a bloom for a week that falls short of the goal', () => {
    const results = [result('s1', '2026-09-28T10:00:00.000Z')]
    expect(goalBlooms(results, 2)).toEqual([])
  })

  it('a non-positive goal never completes', () => {
    const results = [result('s1', '2026-09-28T10:00:00.000Z'), result('s2', '2026-09-29T10:00:00.000Z')]
    expect(goalBlooms(results, 0)).toEqual([])
    expect(goalBlooms(results, -1)).toEqual([])
  })

  it('is deterministic: the same history always grows the same bloom for the same week', () => {
    const results = [result('s1', '2026-09-28T10:00:00.000Z'), result('s2', '2026-09-29T10:00:00.000Z')]
    expect(goalBlooms(results, 2)).toEqual(goalBlooms(results, 2))
  })
})

describe('goalBloomForSession', () => {
  it('finds the bloom for the session that earned it, and null for any other', () => {
    const results = [result('s1', '2026-09-28T10:00:00.000Z'), result('s2', '2026-09-29T10:00:00.000Z')]
    expect(goalBloomForSession(results, 2, 's2')?.sessionId).toBe('s2')
    expect(goalBloomForSession(results, 2, 's1')).toBeNull()
    expect(goalBloomForSession(results, 2, 'nope')).toBeNull()
  })
})

describe('garden species pool coverage', () => {
  it('the goal pool only ever reaches species that exist in the garden', () => {
    const blooms = goalBlooms(
      Array.from({ length: 40 }, (_, i) => result(`s${i}`, `2026-0${(i % 2) + 1}-0${(i % 27) + 1}T10:00:00.000Z`)),
      2
    )
    for (const b of blooms) expect(GARDEN_SPECIES).toContainEqual(b.species)
  })
})
