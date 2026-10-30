import { describe, expect, it } from 'vitest'
import { sessionHighlights } from './sessionHighlights'
import type { SetRecord } from './types'
import type { SessionResult } from '../session/types'
import { projectSetRecords } from './history'
import { clonedHistory, syntheticHistory } from './__fixtures__/syntheticHistory'

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

describe('sessionHighlights on projected history (one shared pass)', () => {
  const now = new Date(2026, 9, 29, 18)
  for (const [name, history] of [
    ['varied', syntheticHistory({ sessions: 120, now, seed: 11 })],
    ['plateau', clonedHistory({ sessions: 60, now })],
  ] as const) {
    it(`gives every ${name} session the same new bests as a full scan`, () => {
      const projected = projectSetRecords(history.plans, history.results, history.events)
      // A copy isn't a projection, so it takes the scanning path.
      const scanned = [...projected]
      for (const r of history.results) {
        expect(sessionHighlights(projected, history.results, r.sessionId)).toEqual(
          sessionHighlights(scanned, history.results, r.sessionId)
        )
      }
      const multi = history.results.some((r) => sessionHighlights(projected, history.results, r.sessionId).newBests.length > 1)
      expect(multi).toBe(name === 'varied')
    })
  }

  it('judges a session at its result time, not its records, when they disagree', () => {
    const history = syntheticHistory({ sessions: 30, now, seed: 5 })
    const projected = projectSetRecords(history.plans, history.results, history.events)
    const moved = history.results.map((r) => ({ ...r, endedAt: '2026-01-01T00:00:00.000Z' }))
    for (const r of moved) {
      expect(sessionHighlights(projected, moved, r.sessionId)).toEqual(sessionHighlights([...projected], moved, r.sessionId))
    }
  })
})
