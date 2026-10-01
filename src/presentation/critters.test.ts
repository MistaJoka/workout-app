import { describe, expect, it } from 'vitest'
import { crittersForFlowerCount, layoutCritters } from './critters'

describe('crittersForFlowerCount', () => {
  it('has no critters for an empty garden', () => {
    expect(crittersForFlowerCount(0)).toEqual([])
    expect(crittersForFlowerCount(-3)).toEqual([])
  })

  it('is one butterfly for 1-4 flowers', () => {
    for (const n of [1, 2, 3, 4]) {
      expect(crittersForFlowerCount(n)).toEqual(['butterfly'])
    }
  })

  it('adds a bee for 5-14 flowers', () => {
    for (const n of [5, 9, 14]) {
      expect(crittersForFlowerCount(n)).toEqual(['butterfly', 'bee'])
    }
  })

  it('adds a ladybug for 15+ flowers', () => {
    for (const n of [15, 32, 500]) {
      expect(crittersForFlowerCount(n)).toEqual(['butterfly', 'bee', 'ladybug'])
    }
  })

  it('never exceeds the 4-critter cap, however large the garden', () => {
    for (const n of [15, 100, 10_000]) {
      expect(crittersForFlowerCount(n).length).toBeLessThanOrEqual(4)
    }
  })
})

describe('layoutCritters', () => {
  it('is deterministic: the same count always lays out the same cast', () => {
    expect(layoutCritters(20)).toEqual(layoutCritters(20))
  })

  it('matches crittersForFlowerCount for which kinds appear', () => {
    expect(layoutCritters(0)).toEqual([])
    expect(layoutCritters(3).map((c) => c.kind)).toEqual(['butterfly'])
    expect(layoutCritters(10).map((c) => c.kind)).toEqual(['butterfly', 'bee'])
    expect(layoutCritters(20).map((c) => c.kind)).toEqual(['butterfly', 'bee', 'ladybug'])
  })

  it('every path point and timing value stays in bounds', () => {
    for (const critter of layoutCritters(20)) {
      expect(critter.path.length).toBeGreaterThanOrEqual(2)
      for (const point of critter.path) {
        expect(point.xPct).toBeGreaterThanOrEqual(0)
        expect(point.xPct).toBeLessThanOrEqual(100)
        expect(point.yPct).toBeGreaterThanOrEqual(0)
        expect(point.yPct).toBeLessThanOrEqual(100)
      }
      expect(critter.durationSec).toBeGreaterThanOrEqual(6)
      expect(critter.durationSec).toBeLessThanOrEqual(12)
      expect(critter.delaySec).toBeGreaterThanOrEqual(0)
      expect(critter.delaySec).toBeLessThanOrEqual(3)
    }
  })

  it('never reshuffles: a critter already on screen keeps its exact path as the garden grows', () => {
    const full = layoutCritters(40)
    for (const flowerCount of [1, 5, 15]) {
      const partial = layoutCritters(flowerCount)
      // Every critter present at this smaller count is present, identical,
      // at the full-garden count too -- counts only ever add critters.
      for (const critter of partial) {
        expect(full.find((c) => c.id === critter.id)).toEqual(critter)
      }
    }
  })

  it('a critter path does not depend on the flower count, only on its own identity', () => {
    // A butterfly at a 3-flower garden flies the same path as the
    // butterfly at a 1000-flower garden: the seed is kind+index, not count.
    const small = layoutCritters(3).find((c) => c.kind === 'butterfly')
    const huge = layoutCritters(1000).find((c) => c.kind === 'butterfly')
    expect(small).toEqual(huge)
  })

  it('two different critters almost never land on the exact same path', () => {
    const [butterfly, bee] = layoutCritters(10)
    expect(butterfly.path).not.toEqual(bee.path)
  })
})
