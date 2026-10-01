import { describe, expect, it } from 'vitest'
import {
  calculateStreak,
  calculateVolume,
  calculateWeekStreak,
  detectPersonalRecords,
  perExerciseHistory,
  weeklyGoal,
  weeklyTotals,
  weekProgress,
} from './stats'
import { EMPTY_SCHEDULE } from '../schedule/weeklySchedule'
import type { SetRecord } from './types'
import type { SessionResult } from '../session/types'

function rec(overrides: Partial<SetRecord>): SetRecord {
  return {
    exerciseId: 'squat',
    exerciseName: 'Squat',
    sessionId: 's1',
    sessionEndedAt: '2026-09-02T10:00:00.000Z',
    setNumber: 1,
    prescribedReps: 10,
    met: true,
    ...overrides,
  }
}

function result(sessionId: string, endedAt: string): SessionResult {
  return { sessionId, planId: sessionId, status: 'COMPLETED', startedAt: endedAt, endedAt, totalSetsCompleted: 1, totalSetsPlanned: 1 }
}

// Local-time ISO strings so calendar-day tests don't depend on the runner's zone.
function local(y: number, m: number, d: number, h = 10): Date {
  return new Date(y, m - 1, d, h)
}

describe('calculateVolume', () => {
  it('sums prescribed reps of met rep-sets and seconds of met timed sets, separately', () => {
    const volume = calculateVolume([
      rec({ prescribedReps: 10, met: true }),
      rec({ prescribedReps: 10, met: true, setNumber: 2 }),
      rec({ exerciseId: 'plank', prescribedReps: undefined, prescribedSeconds: 20, met: true }),
    ])
    expect(volume).toEqual({ reps: 20, seconds: 20, loadKg: 0 })
  })

  it('does not count missed sets', () => {
    expect(calculateVolume([rec({ met: false })])).toEqual({ reps: 0, seconds: 0, loadKg: 0 })
  })
})

describe('detectPersonalRecords', () => {
  it('records the best met prescription per exercise and which session set it', () => {
    const records = detectPersonalRecords([
      rec({ sessionId: 's1', sessionEndedAt: '2026-09-01T10:00:00.000Z', prescribedReps: 10 }),
      rec({ sessionId: 's2', sessionEndedAt: '2026-09-03T10:00:00.000Z', prescribedReps: 12 }),
      rec({ exerciseId: 'plank', exerciseName: 'Plank', sessionId: 's2', sessionEndedAt: '2026-09-03T10:00:00.000Z', prescribedReps: undefined, prescribedSeconds: 30 }),
    ])
    expect(records.get('squat')).toEqual({ exerciseId: 'squat', exerciseName: 'Squat', unit: 'reps', value: 12, sessionId: 's2', sessionEndedAt: '2026-09-03T10:00:00.000Z' })
    expect(records.get('plank')?.unit).toBe('seconds')
    expect(records.get('plank')?.value).toBe(30)
  })

  it('only a strict improvement moves the record: a tie keeps the earlier session', () => {
    const records = detectPersonalRecords([
      rec({ sessionId: 's1', sessionEndedAt: '2026-09-01T10:00:00.000Z', prescribedReps: 12 }),
      rec({ sessionId: 's2', sessionEndedAt: '2026-09-03T10:00:00.000Z', prescribedReps: 12 }),
    ])
    expect(records.get('squat')?.sessionId).toBe('s1')
  })

  it('ignores missed sets — no record is invented from a prescription that was not met', () => {
    const records = detectPersonalRecords([rec({ prescribedReps: 20, met: false }), rec({ prescribedReps: 8, met: true, setNumber: 2 })])
    expect(records.get('squat')?.value).toBe(8)
  })
})

describe('weeklyGoal', () => {
  it('is the number of planned workout days, or 2 with no plan', () => {
    expect(weeklyGoal(null)).toBe(2)
    expect(weeklyGoal(EMPTY_SCHEDULE)).toBe(2)
    expect(weeklyGoal({ ...EMPTY_SCHEDULE, 1: 'fs.full-body-a', 3: 'fs.full-body-b', 5: 'fs.quick-10', 0: 'rest' })).toBe(3)
  })
})

describe('calculateWeekStreak', () => {
  // 2026-09-28 is a Monday.
  const at = (d: number) => result(`r${d}`, local(2026, 9, d).toISOString())

  it('counts consecutive Monday-start weeks that met the goal, including this week once met', () => {
    const now = local(2026, 9, 30) // Wednesday
    const results = [at(14), at(16), at(21), at(24), at(28), at(29)]
    expect(calculateWeekStreak(results, 2, now)).toBe(3)
  })

  it("doesn't break on a week still in progress", () => {
    const now = local(2026, 9, 29) // Tuesday, nothing yet this week
    const results = [at(14), at(16), at(21), at(24)]
    expect(calculateWeekStreak(results, 2, now)).toBe(2)
  })

  it('stops at the first past week that fell short', () => {
    const now = local(2026, 9, 29)
    const results = [at(7), at(9), at(14), at(21), at(24)]
    expect(calculateWeekStreak(results, 2, now)).toBe(1)
  })

  it('is zero with no history', () => {
    expect(calculateWeekStreak([], 2, local(2026, 9, 29))).toBe(0)
  })
})

describe('calculateStreak', () => {
  it('counts consecutive local calendar days ending today', () => {
    const now = local(2026, 9, 10)
    const results = [result('a', local(2026, 9, 8).toISOString()), result('b', local(2026, 9, 9).toISOString()), result('c', local(2026, 9, 10).toISOString())]
    expect(calculateStreak(results, now)).toBe(3)
  })

  it('keeps a streak alive when the last workout was yesterday (one-day grace)', () => {
    const now = local(2026, 9, 10)
    const results = [result('a', local(2026, 9, 8).toISOString()), result('b', local(2026, 9, 9).toISOString())]
    expect(calculateStreak(results, now)).toBe(2)
  })

  it('drops to zero once a full day has been missed', () => {
    const now = local(2026, 9, 10)
    expect(calculateStreak([result('a', local(2026, 9, 8).toISOString())], now)).toBe(0)
  })

  it('counts a day once regardless of how many sessions it had', () => {
    const now = local(2026, 9, 10)
    const results = [result('a', local(2026, 9, 10, 8).toISOString()), result('b', local(2026, 9, 10, 18).toISOString())]
    expect(calculateStreak(results, now)).toBe(1)
  })

  it('uses calendar dates, so a DST transition inside the streak does not break it', () => {
    // 2026-03-08 is the US DST switch; the runner's zone may or may not
    // observe it — either way, consecutive calendar dates must count.
    const now = local(2026, 3, 9)
    const results = [result('a', local(2026, 3, 7).toISOString()), result('b', local(2026, 3, 8).toISOString()), result('c', local(2026, 3, 9).toISOString())]
    expect(calculateStreak(results, now)).toBe(3)
  })
})

describe('weeklyTotals', () => {
  it('returns one bucket per ISO week (Monday start), oldest first, ending with the current week', () => {
    const now = local(2026, 9, 10) // Thursday
    const results = [
      result('a', local(2026, 9, 7).toISOString()), // Mon this week
      result('b', local(2026, 9, 9).toISOString()), // Wed this week
      result('c', local(2026, 9, 6).toISOString()), // Sun last week
      result('d', local(2026, 7, 1).toISOString()), // too old for a 4-week window
    ]
    const totals = weeklyTotals(results, now, 4)
    expect(totals).toHaveLength(4)
    expect(totals[3]).toEqual({ weekStart: '2026-09-07', sessions: 2 })
    expect(totals[2]).toEqual({ weekStart: '2026-08-31', sessions: 1 })
    expect(totals[0].sessions).toBe(0)
  })
})

describe('perExerciseHistory', () => {
  it('collapses sets into one point per session with met/total counts and the prescription', () => {
    const history = perExerciseHistory(
      [
        rec({ sessionId: 's1', sessionEndedAt: '2026-09-01T10:00:00.000Z', prescribedReps: 10, met: true, setNumber: 1 }),
        rec({ sessionId: 's1', sessionEndedAt: '2026-09-01T10:00:00.000Z', prescribedReps: 10, met: false, setNumber: 2 }),
        rec({ sessionId: 's2', sessionEndedAt: '2026-09-03T10:00:00.000Z', prescribedReps: 12, met: true, setNumber: 1 }),
        rec({ exerciseId: 'plank', sessionId: 's2', sessionEndedAt: '2026-09-03T10:00:00.000Z' }),
      ],
      'squat'
    )
    expect(history).toEqual([
      { sessionId: 's1', sessionEndedAt: '2026-09-01T10:00:00.000Z', unit: 'reps', prescribed: 10, metSets: 1, totalSets: 2 },
      { sessionId: 's2', sessionEndedAt: '2026-09-03T10:00:00.000Z', unit: 'reps', prescribed: 12, metSets: 1, totalSets: 1 },
    ])
  })
})

describe('weekProgress', () => {
  // 2026-09-28 is a Monday.
  const at = (d: number) => result(`r${d}`, local(2026, 9, d).toISOString())
  const now = local(2026, 9, 30) // Wednesday

  it('counts only this Monday-start week against the goal', () => {
    expect(weekProgress([at(27), at(28)], null, now)).toEqual({ done: 1, goal: 2, met: false })
  })

  it('is met once done reaches the goal, and keeps counting past it', () => {
    expect(weekProgress([at(28), at(29), at(30)], null, now)).toEqual({ done: 3, goal: 2, met: true })
  })

  it('takes the goal from the schedule', () => {
    const schedule = { ...EMPTY_SCHEDULE, 1: 'fs.full-body-a', 3: 'fs.full-body-b', 5: 'fs.full-body-a' }
    expect(weekProgress([at(28)], schedule, now)).toEqual({ done: 1, goal: 3, met: false })
  })

  it('starts at zero with no workouts', () => {
    expect(weekProgress([], null, now)).toEqual({ done: 0, goal: 2, met: false })
  })
})
