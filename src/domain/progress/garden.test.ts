import { describe, expect, it } from 'vitest'
import { GARDEN_SPECIES, buildGarden, buildGardenSets, sessionBloom, speciesFor, type Rarity } from './garden'
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

  it('with no weeklyGoal passed, behaves exactly as before goal blooms existed', () => {
    const results = [result('a', '2026-09-28T10:00:00.000Z'), result('b', '2026-09-29T10:00:00.000Z')]
    const garden = buildGarden(results)
    expect(garden.flowers).toHaveLength(2)
    expect(garden.flowers.every((f) => f.goal == null)).toBe(true)
  })

  it('a week that meets the goal adds one bonus flower, flagged goal:true, right after the workout that earned it', () => {
    const results = [
      result('a', '2026-09-28T10:00:00.000Z'), // Monday
      result('b', '2026-09-29T10:00:00.000Z'), // Tuesday, reaches goal 2
    ]
    const garden = buildGarden(results, 2)
    expect(garden.flowers).toHaveLength(3)
    expect(garden.flowers.map((f) => ({ sessionId: f.sessionId, goal: f.goal ?? false }))).toEqual([
      { sessionId: 'a', goal: false },
      { sessionId: 'b', goal: false },
      { sessionId: 'b', goal: true },
    ])
    expect(garden.flowers[2].species.rarity).not.toBe('common')
    expect(garden.flowers[2].endedAt).toBe('2026-09-29T10:00:00.000Z')
  })

  it('a goal bloom counts toward discovered species and overall counts', () => {
    const results = [result('a', '2026-09-28T10:00:00.000Z'), result('b', '2026-09-29T10:00:00.000Z')]
    const withoutGoal = buildGarden(results, 0)
    const withGoal = buildGarden(results, 2)
    expect(withGoal.flowers.length).toBe(withoutGoal.flowers.length + 1)
    const goalFlower = withGoal.flowers.find((f) => f.goal)!
    expect(withGoal.counts.get(goalFlower.species.id)).toBe((withoutGoal.counts.get(goalFlower.species.id) ?? 0) + 1)
  })

  it('a falling-short week never adds a bonus flower', () => {
    const results = [result('a', '2026-09-28T10:00:00.000Z')]
    const garden = buildGarden(results, 2)
    expect(garden.flowers).toHaveLength(1)
  })
})

// Finds one sessionId per species in the given rarity tier, by scanning an
// id sequence until every species of that tier has turned up at least once.
function sessionIdsForTier(rarity: Rarity): string[] {
  const species = GARDEN_SPECIES.filter((s) => s.rarity === rarity)
  const chosen = new Map<string, string>()
  for (let i = 0; chosen.size < species.length && i < 100_000; i++) {
    const id = `tier-${rarity}-${i}`
    const s = speciesFor(id)
    if (s.rarity === rarity && !chosen.has(s.id)) chosen.set(s.id, id)
  }
  expect(chosen.size).toBe(species.length)
  return species.map((s) => chosen.get(s.id)!)
}

describe('buildGardenSets', () => {
  it('reports discovered/total and an incomplete flag per tier, and overall completion, for a partial garden', () => {
    const commonIds = sessionIdsForTier('common')
    // Grow every common species but leave the other tiers untouched.
    const results = commonIds.map((id, i) => result(id, `2026-09-${String(i + 1).padStart(2, '0')}T10:00:00.000Z`))
    const garden = buildGarden(results)
    const sets = buildGardenSets(garden)

    expect(sets.tiers.map((t) => t.rarity)).toEqual(['common', 'uncommon', 'rare', 'legendary'])
    const common = sets.tiers.find((t) => t.rarity === 'common')!
    expect(common).toMatchObject({ discovered: 8, total: 8, complete: true })
    // The last common species grown (by endedAt) sets the tier's completion date.
    expect(common.completedAt).toBe(results[results.length - 1].endedAt)

    for (const rarity of ['uncommon', 'rare', 'legendary'] as const) {
      const tier = sets.tiers.find((t) => t.rarity === rarity)!
      expect(tier.complete).toBe(false)
      expect(tier.discovered).toBe(0)
      expect(tier.completedAt).toBeNull()
    }
    expect(sets.overallComplete).toBe(false)
  })

  it('an empty garden has every tier incomplete with its full total', () => {
    const sets = buildGardenSets(buildGarden([]))
    expect(sets.tiers).toEqual([
      { rarity: 'common', label: 'Commons', discovered: 0, total: 8, complete: false, completedAt: null },
      { rarity: 'uncommon', label: 'Uncommons', discovered: 0, total: 4, complete: false, completedAt: null },
      { rarity: 'rare', label: 'Rares', discovered: 0, total: 2, complete: false, completedAt: null },
      { rarity: 'legendary', label: 'Legendary', discovered: 0, total: 1, complete: false, completedAt: null },
    ])
    expect(sets.overallComplete).toBe(false)
  })

  it('completing every tier marks the garden overall complete', () => {
    const allIds = (['common', 'uncommon', 'rare', 'legendary'] as const).flatMap(sessionIdsForTier)
    const results = allIds.map((id, i) => result(id, `2026-09-${String((i % 28) + 1).padStart(2, '0')}T10:00:00.000Z`))
    const sets = buildGardenSets(buildGarden(results))
    expect(sets.tiers.every((t) => t.complete)).toBe(true)
    expect(sets.overallComplete).toBe(true)
    expect(sets.tiers.every((t) => t.completedAt !== null)).toBe(true)
  })

  it("completedAt is the latest species' first-seen date, not simply the last session played", () => {
    // Grow all 8 common species, then play one more common-tier session
    // afterwards (a duplicate species) — the tier should still have
    // completed on the date its last *new* species arrived, not later.
    const commonIds = sessionIdsForTier('common')
    const results = commonIds.map((id, i) => result(id, `2026-09-${String(i + 1).padStart(2, '0')}T10:00:00.000Z`))
    // A later session, whatever species it grows, must not push the tier's
    // completion date forward once every species already has a first-seen date.
    const dupe = result('tier-common-dupe', '2026-10-01T10:00:00.000Z')
    const sets = buildGardenSets(buildGarden([...results, dupe]))
    const common = sets.tiers.find((t) => t.rarity === 'common')!
    expect(common.completedAt).toBe(results[results.length - 1].endedAt)
    expect(common.completedAt).not.toBe(dupe.endedAt)
  })
})
