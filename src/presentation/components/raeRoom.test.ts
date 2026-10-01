import { describe, expect, it } from 'vitest'
import { newestFlowers, pickTapLine, RAE_TAP_LINES, shouldRevealNewestFlower } from './raeRoom'
import { speciesFor } from '../../domain/progress/garden'

function flower(sessionId: string) {
  return { sessionId, endedAt: sessionId, species: speciesFor(sessionId) }
}

describe('newestFlowers', () => {
  it('keeps the newest few, oldest of the bunch first', () => {
    const flowers = ['a', 'b', 'c', 'd', 'e'].map(flower)
    expect(newestFlowers(flowers, 4).map((f) => f.sessionId)).toEqual(['b', 'c', 'd', 'e'])
  })

  it('returns everything when there are fewer than the max', () => {
    const flowers = ['a', 'b'].map(flower)
    expect(newestFlowers(flowers, 4).map((f) => f.sessionId)).toEqual(['a', 'b'])
  })

  it('is empty with no flowers yet', () => {
    expect(newestFlowers([], 4)).toEqual([])
  })
})

describe('shouldRevealNewestFlower', () => {
  it('never reveals when nothing has grown', () => {
    expect(shouldRevealNewestFlower(null, null)).toBe(false)
  })

  it('reveals the first time a newest flower is seen', () => {
    expect(shouldRevealNewestFlower(null, 's1')).toBe(true)
  })

  it('reveals again once a newer flower grows', () => {
    expect(shouldRevealNewestFlower('s1', 's2')).toBe(true)
  })

  it('does not reveal a flower already marked seen', () => {
    expect(shouldRevealNewestFlower('s2', 's2')).toBe(false)
  })
})

describe('pickTapLine', () => {
  it('picks from the pool', () => {
    const line = pickTapLine(RAE_TAP_LINES, () => 0)
    expect(RAE_TAP_LINES).toContain(line)
    expect(line).toBe(RAE_TAP_LINES[0])
  })

  it('covers the whole pool as rand sweeps 0..1', () => {
    const seen = new Set<string>()
    for (let i = 0; i < RAE_TAP_LINES.length; i++) {
      seen.add(pickTapLine(RAE_TAP_LINES, () => i / RAE_TAP_LINES.length))
    }
    expect(seen.size).toBe(RAE_TAP_LINES.length)
  })

  it('avoids repeating the last line back to back when it can', () => {
    // First roll lands on index 0 (the line to avoid); the retry roll (0.5)
    // must land elsewhere.
    const rolls = [0, 0.5]
    let i = 0
    const rand = () => rolls[i++]
    const line = pickTapLine(RAE_TAP_LINES, rand, RAE_TAP_LINES[0])
    expect(line).not.toBe(RAE_TAP_LINES[0])
  })

  it('is empty for an empty pool', () => {
    expect(pickTapLine([], () => 0)).toBe('')
  })
})
