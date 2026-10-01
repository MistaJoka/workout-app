import { describe, expect, it } from 'vitest'
import { GARDEN_SPECIES, buildGarden, sessionBloom, speciesFor } from './garden'
import type { SessionResult } from '../session/types'

function result(sessionId: string, endedAt: string): SessionResult {
  return { sessionId, planId: sessionId, status: 'COMPLETED', startedAt: endedAt, endedAt, totalSetsCompleted: 1, totalSetsPlanned: 1 }
}

describe('garden species', () => {
  it('has 15 species: 8 common, 4 uncommon, 2 rare, 1 legendary, with unique ids', () => {
    const count = (r: string) => GARDEN_SPECIES.filter((s) => s.rarity === r).length
    expect(GARDEN_SPECIES).toHaveLength(15)
    expect([count('common'), count('uncommon'), count('rare'), count('legendary')]).toEqual([8, 4, 2, 1])
    expect(new Set(GARDEN_SPECIES.map((s) => s.id)).size).toBe(15)
  })

  it('a session always grows the same species', () => {
    expect(speciesFor('session-abc').id).toBe(speciesFor('session-abc').id)
    expect(speciesFor('9f1c2e7a-0000-4000-8000-000000000001')).toEqual(speciesFor('9f1c2e7a-0000-4000-8000-000000000001'))
  })

  it('rarities land near 70/22/7/1 over many sessions', () => {
    const n = 20000
    const tally = { common: 0, uncommon: 0, rare: 0, legendary: 0 }
    for (let i = 0; i < n; i++) tally[speciesFor(`s-${i}-${(i * 2654435761) % 1000003}`).rarity] += 1
    expect(tally.common / n).toBeGreaterThan(0.66)
    expect(tally.common / n).toBeLessThan(0.74)
    expect(tally.uncommon / n).toBeGreaterThan(0.19)
    expect(tally.uncommon / n).toBeLessThan(0.25)
    expect(tally.rare / n).toBeGreaterThan(0.055)
    expect(tally.rare / n).toBeLessThan(0.085)
    expect(tally.legendary / n).toBeGreaterThan(0.005)
    expect(tally.legendary / n).toBeLessThan(0.016)
  })
})

describe('buildGarden / sessionBloom', () => {
  it('collects flowers in order, counts species, and marks a first discovery', () => {
    // Find two sessions with the same species and one with a different one.
    const ids = Array.from({ length: 200 }, (_, i) => `g-${i}`)
    const first = ids[0]
    const same = ids.find((id, i) => i > 0 && speciesFor(id).id === speciesFor(first).id)!
    const other = ids.find((id) => speciesFor(id).id !== speciesFor(first).id)!
    const results = [
      result(same, '2026-09-03T10:00:00.000Z'),
      result(first, '2026-09-01T10:00:00.000Z'),
      result(other, '2026-09-02T10:00:00.000Z'),
    ]
    const garden = buildGarden(results)
    expect(garden.flowers.map((f) => f.sessionId)).toEqual([first, other, same])
    expect(garden.counts.get(speciesFor(first).id)).toBe(2)
    expect(garden.discovered).toBe(2)
    expect(garden.total).toBe(15)

    expect(sessionBloom(results, first)).toMatchObject({ isNew: true })
    expect(sessionBloom(results, other)).toMatchObject({ isNew: true })
    expect(sessionBloom(results, same)).toMatchObject({ isNew: false, species: speciesFor(first) })
  })

  it('a session with no result still has its species, and counts as new on an empty garden', () => {
    expect(sessionBloom([], 'lonely')).toEqual({ species: speciesFor('lonely'), isNew: true })
  })
})
