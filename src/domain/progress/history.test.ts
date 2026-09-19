import { describe, expect, it } from 'vitest'
import { projectSetRecords } from './history'
import type { SessionEvent, SessionPlan, SessionResult } from '../session/types'

function plan(id: string, exercises: SessionPlan['exercises']): SessionPlan {
  return {
    id,
    templateId: 't',
    templateVersion: 1,
    packId: 'p',
    ruleVersion: 'v1',
    createdAt: '2026-09-01T00:00:00.000Z',
    exercises,
    adaptations: [],
    reproducibilityHash: 'h',
  }
}

function result(sessionId: string, endedAt: string, status: SessionResult['status'] = 'COMPLETED'): SessionResult {
  return { sessionId, planId: sessionId, status, startedAt: endedAt, endedAt, totalSetsCompleted: 0, totalSetsPlanned: 0 }
}

function setCompleted(sessionId: string, seq: number, payload: Record<string, unknown>): SessionEvent {
  return { seq, eventId: `${sessionId}-${seq}`, sessionId, type: 'SET_COMPLETED', timestamp: '2026-09-01T00:00:00.000Z', payload }
}

const squat = { exerciseId: 'squat', exerciseVersion: 1, name: 'Squat', sets: 2, reps: 10, restSeconds: 45, order: 0 }
const plank = { exerciseId: 'plank', exerciseVersion: 1, name: 'Plank', sets: 1, timeSeconds: 20, restSeconds: 45, order: 1 }

describe('projectSetRecords', () => {
  it('maps each SET_COMPLETED event to its plan slot (exercise + set number) in order', () => {
    const records = projectSetRecords(
      [plan('s1', [squat, plank])],
      [result('s1', '2026-09-02T10:00:00.000Z')],
      [
        setCompleted('s1', 1, { exerciseId: 'squat', met: true }),
        setCompleted('s1', 2, { exerciseId: 'squat', met: false }),
        setCompleted('s1', 3, { exerciseId: 'plank' }),
      ]
    )
    expect(records).toEqual([
      { exerciseId: 'squat', exerciseName: 'Squat', sessionId: 's1', sessionEndedAt: '2026-09-02T10:00:00.000Z', setNumber: 1, prescribedReps: 10, met: true },
      { exerciseId: 'squat', exerciseName: 'Squat', sessionId: 's1', sessionEndedAt: '2026-09-02T10:00:00.000Z', setNumber: 2, prescribedReps: 10, met: false },
      { exerciseId: 'plank', exerciseName: 'Plank', sessionId: 's1', sessionEndedAt: '2026-09-02T10:00:00.000Z', setNumber: 1, prescribedSeconds: 20, met: true },
    ])
  })

  it('ignores sessions with no result (still in progress) and events of other types', () => {
    const records = projectSetRecords(
      [plan('s1', [squat]), plan('s2', [squat])],
      [result('s1', '2026-09-02T10:00:00.000Z')],
      [
        { seq: 1, eventId: 'a', sessionId: 's1', type: 'SESSION_STARTED', timestamp: '', payload: {} },
        setCompleted('s1', 2, { exerciseId: 'squat', met: true }),
        setCompleted('s2', 3, { exerciseId: 'squat', met: true }),
      ]
    )
    expect(records.map((r) => r.sessionId)).toEqual(['s1'])
  })

  it('includes shortened sessions, and only the sets actually completed', () => {
    const records = projectSetRecords(
      [plan('s1', [squat, plank])],
      [result('s1', '2026-09-02T10:00:00.000Z', 'COMPLETED_SHORTENED')],
      [setCompleted('s1', 1, { exerciseId: 'squat', met: true })]
    )
    expect(records).toHaveLength(1)
    expect(records[0].setNumber).toBe(1)
  })

  it('orders records by session end time, oldest first, regardless of input order', () => {
    const records = projectSetRecords(
      [plan('late', [squat]), plan('early', [squat])],
      [result('late', '2026-09-05T10:00:00.000Z'), result('early', '2026-09-02T10:00:00.000Z')],
      [setCompleted('late', 1, { met: true }), setCompleted('early', 2, { met: true })]
    )
    expect(records.map((r) => r.sessionId)).toEqual(['early', 'late'])
  })

  it('treats a missing met flag (time-based or legacy events) as completed, never as a miss', () => {
    const records = projectSetRecords([plan('s1', [squat])], [result('s1', '2026-09-02T10:00:00.000Z')], [setCompleted('s1', 1, {})])
    expect(records[0].met).toBe(true)
  })
})
