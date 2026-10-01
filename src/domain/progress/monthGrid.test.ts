import { describe, expect, it } from 'vitest'
import { monthGrid, shiftMonth } from './monthGrid'

// Local-time ISO strings, so the tests read the same in any timezone.
function at(y: number, m: number, d: number, h = 18): string {
  return new Date(y, m, d, h).toISOString()
}

describe('monthGrid', () => {
  const now = new Date(2026, 8, 30, 12) // Wednesday, September 30, 2026

  it('lays out a Monday-start month in whole weeks, padding outside days', () => {
    const grid = monthGrid({ year: 2026, month: 8 }, [], now)
    // September 1, 2026 is a Tuesday: one padding day before it.
    expect(grid.weeks[0][0].inMonth).toBe(false)
    expect(grid.weeks[0][1]).toMatchObject({ inMonth: true, day: 1 })
    expect(grid.weeks.every((w) => w.length === 7)).toBe(true)
    const inMonth = grid.weeks.flat().filter((c) => c.inMonth)
    expect(inMonth).toHaveLength(30)
    expect(inMonth.at(-1)?.day).toBe(30)
  })

  it('marks today and future days', () => {
    const grid = monthGrid({ year: 2026, month: 9 }, [], new Date(2026, 9, 15, 9))
    const cells = grid.weeks.flat().filter((c) => c.inMonth)
    expect(cells.find((c) => c.day === 15)).toMatchObject({ isToday: true, isFuture: false })
    expect(cells.find((c) => c.day === 16)).toMatchObject({ isToday: false, isFuture: true })
    expect(cells.find((c) => c.day === 14)).toMatchObject({ isToday: false, isFuture: false })
  })

  it('puts each finished workout on its local day, newest first', () => {
    const results = [
      { sessionId: 'a', endedAt: at(2026, 8, 30, 8) },
      { sessionId: 'b', endedAt: at(2026, 8, 30, 19) },
      { sessionId: 'c', endedAt: at(2026, 8, 2) },
      { sessionId: 'other-month', endedAt: at(2026, 7, 31) },
    ]
    const cells = monthGrid({ year: 2026, month: 8 }, results, now).weeks.flat()
    expect(cells.find((c) => c.inMonth && c.day === 30)?.sessions.map((s) => s.sessionId)).toEqual(['b', 'a'])
    expect(cells.find((c) => c.inMonth && c.day === 2)?.sessions.map((s) => s.sessionId)).toEqual(['c'])
    // A padding cell never carries the neighbouring month's workouts.
    expect(cells.filter((c) => !c.inMonth).every((c) => c.sessions.length === 0)).toBe(true)
    expect(monthGrid({ year: 2026, month: 8 }, results, now).doneDays).toBe(2)
  })
})

describe('shiftMonth', () => {
  it('moves across year boundaries', () => {
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 })
    expect(shiftMonth({ year: 2025, month: 11 }, 1)).toEqual({ year: 2026, month: 0 })
    expect(shiftMonth({ year: 2026, month: 8 }, 0)).toEqual({ year: 2026, month: 8 })
  })
})
