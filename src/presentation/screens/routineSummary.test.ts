import { describe, expect, it } from 'vitest'
import { plannedDaysLabel, routineSummary } from './routineSummary'
import { EMPTY_SCHEDULE } from '../../domain/schedule/weeklySchedule'
import type { WorkoutTemplate } from '../../domain/content/types'

const t = (exercises: Array<{ sets: number; reps?: number; timeSeconds?: number }>): WorkoutTemplate =>
  ({
    id: 'x',
    exercises: exercises.map((p, i) => ({ exerciseId: `e${i}`, prescription: { restSeconds: 45, ...p } })),
  }) as unknown as WorkoutTemplate

describe('routineSummary', () => {
  it('counts moves and sets and estimates minutes', () => {
    expect(routineSummary(t([{ sets: 2, reps: 10 }, { sets: 2, timeSeconds: 20 }]))).toBe('2 moves, 4 sets, about 10 min')
  })
  it('uses singular words for one', () => {
    expect(routineSummary(t([{ sets: 1, reps: 10 }]))).toBe('1 move, 1 set, about 5 min')
  })
})

describe('plannedDaysLabel', () => {
  it('lists planned days Monday first, short names', () => {
    const schedule = { ...EMPTY_SCHEDULE, 0: 'x', 1: 'x', 4: 'x', 2: 'rest', 3: 'other' }
    expect(plannedDaysLabel(schedule, 'x')).toBe('Mon, Thu, Sun')
  })
  it('is null when the routine is not planned or there is no schedule', () => {
    expect(plannedDaysLabel(EMPTY_SCHEDULE, 'x')).toBeNull()
    expect(plannedDaysLabel(null, 'x')).toBeNull()
  })
})
