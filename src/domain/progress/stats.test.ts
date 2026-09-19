import { describe, expect, it } from 'vitest'
import { calculateStreak, calculateVolume, detectPersonalRecords, perExerciseHistory, weeklyTotals } from './stats'
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
    expect(volume).toEqual({ reps: 20, seconds: 20 })
  })

  it('does not count missed sets', () => {
    expect(calculateVolume([rec({ met: false })])).toEqual({ reps: 0, seconds: 0 })
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
