import { describe, expect, it } from 'vitest'
import { summarizeBodyWeight } from './bodyWeight'

const now = new Date(2026, 8, 19)

describe('summarizeBodyWeight', () => {
  it('returns null with no entries and no change with a single entry', () => {
    expect(summarizeBodyWeight([], now)).toBeNull()
    expect(summarizeBodyWeight([{ day: '2026-09-19', kg: 80 }], now)).toMatchObject({ latest: { kg: 80 }, changeKg: null })
  })

  it('measures change against the newest entry at or before 30 days ago', () => {
    const s = summarizeBodyWeight(
      [
        { day: '2026-07-01', kg: 84 },
        { day: '2026-08-18', kg: 82 },
        { day: '2026-08-25', kg: 81 },
        { day: '2026-09-19', kg: 80 },
      ],
      now
    )!
    expect(s.changeKg).toBe(-2) // vs 2026-08-18 (the last at/before 08-20), not 07-01
  })

  it('falls back to the oldest entry for short histories, and sorts points by day', () => {
    const s = summarizeBodyWeight(
      [
        { day: '2026-09-19', kg: 80 },
        { day: '2026-09-10', kg: 81.4 },
      ],
      now
    )!
    expect(s.changeKg).toBe(-1.4)
    expect(s.points.map((p) => p.day)).toEqual(['2026-09-10', '2026-09-19'])
  })
})
