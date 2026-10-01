import { describe, expect, it } from 'vitest'
import { dayCellLabel } from './MonthBlooms'
import { speciesFor } from '../../domain/progress/garden'
import type { MonthCell } from '../../domain/progress/monthGrid'

function cell(sessions: MonthCell['sessions'], isToday = false): MonthCell {
  return { key: '2026-09-30', day: 30, inMonth: true, isToday, isFuture: false, sessions }
}

describe('dayCellLabel', () => {
  it('names the date only for a day without a workout', () => {
    expect(dayCellLabel(cell([]))).toBe('September 30')
    expect(dayCellLabel(cell([], true))).toBe('September 30, today')
  })

  it("counts the day's workouts and ends with the flowers they grew", () => {
    expect(dayCellLabel(cell([{ sessionId: 'a', endedAt: '' }], true))).toBe(
      `September 30, today, 1 workout done, ${speciesFor('a').name}`
    )
    const [x, y] = [speciesFor('b').name, speciesFor('a').name]
    expect(
      dayCellLabel(
        cell([
          { sessionId: 'b', endedAt: '' },
          { sessionId: 'a', endedAt: '' },
        ])
      )
    ).toBe(`September 30, 2 workouts done, ${x === y ? x : `${x} and ${y}`}`)
  })
})
