import { describe, expect, it } from 'vitest'
import { sessionHighlights } from './sessionHighlights'
import type { SetRecord } from './types'
import type { SessionResult } from '../session/types'

function rec(sessionId: string, endedAt: string, exerciseId: string, reps: number, met = true): SetRecord {
  return {
    exerciseId,
    exerciseName: exerciseId === 'sq' ? 'Squat' : 'Plank',
    sessionId,
    sessionEndedAt: endedAt,
    setNumber: 1,
    prescribedReps: reps,
    met,
  }
}

function res(sessionId: string, endedAt: string): SessionResult {
  return { sessionId, planId: sessionId, status: 'COMPLETED', startedAt: endedAt, endedAt, totalSetsCompleted: 1, totalSetsPlanned: 1 }
}

describe('sessionHighlights', () => {
  it('a first-ever move is not a new best, and the first workout is a milestone', () => {
    const h = sessionHighlights([rec('s1', '2026-09-01T10:00:00Z', 'sq', 10)], [res('s1', '2026-09-01T10:00:00Z')], 's1')
    expect(h.newBests).toEqual([])
    expect(h.milestone).toBe(1)
  })

  it('reports a strictly better value than any earlier session as a new best', () => {
    const records = [rec('s1', '2026-09-01T10:00:00Z', 'sq', 10), rec('s2', '2026-09-03T10:00:00Z', 'sq', 12)]
    const h = sessionHighlights(records, [res('s1', '2026-09-01T10:00:00Z'), res('s2', '2026-09-03T10:00:00Z')], 's2')
    expect(h.newBests).toEqual([expect.objectContaining({ exerciseId: 'sq', exerciseName: 'Squat', unit: 'reps', value: 12 })])
    expect(h.milestone).toBeNull()
  })

  it('a tie or a missed set is not a new best', () => {
    const records = [
      rec('s1', '2026-09-01T10:00:00Z', 'sq', 12),
      rec('s2', '2026-09-03T10:00:00Z', 'sq', 12),
      rec('s2', '2026-09-03T10:00:00Z', 'sq', 14, false),
    ]
    const h = sessionHighlights(records, [res('s1', '2026-09-01T10:00:00Z'), res('s2', '2026-09-03T10:00:00Z')], 's2')
    expect(h.newBests).toEqual([])
  })

  it('ignores later sessions when judging an older one', () => {
    const records = [
      rec('s1', '2026-09-01T10:00:00Z', 'sq', 10),
      rec('s2', '2026-09-03T10:00:00Z', 'sq', 12),
      rec('s3', '2026-09-05T10:00:00Z', 'sq', 14),
    ]
    const results = [res('s1', '2026-09-01T10:00:00Z'), res('s2', '2026-09-03T10:00:00Z'), res('s3', '2026-09-05T10:00:00Z')]
    expect(sessionHighlights(records, results, 's2').newBests.map((b) => b.value)).toEqual([12])
  })

  it('counts milestones at 1, 5, 10, 25, 50 and 100 finished workouts', () => {
    const results = Array.from({ length: 10 }, (_, i) => res(`s${i + 1}`, `2026-09-${String(i + 1).padStart(2, '0')}T10:00:00Z`))
    expect(sessionHighlights([], results, 's5').milestone).toBe(5)
    expect(sessionHighlights([], results, 's6').milestone).toBeNull()
    expect(sessionHighlights([], results, 's10').milestone).toBe(10)
  })
})
