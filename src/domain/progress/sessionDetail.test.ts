import { describe, expect, it } from 'vitest'
import { summarizeSession } from './sessionDetail'
import type { SessionEvent, SessionPlan, SessionResult } from '../session/types'

const plan: SessionPlan = {
  id: 's1',
  templateId: 't',
  templateVersion: 1,
  packId: 'p',
  ruleVersion: 'v1',
  createdAt: '2026-09-01T10:00:00.000Z',
  exercises: [
    { exerciseId: 'squat', exerciseVersion: 1, name: 'Squat', sets: 2, reps: 10, restSeconds: 45, order: 0 },
    { exerciseId: 'plank', exerciseVersion: 1, name: 'Plank', sets: 1, timeSeconds: 20, restSeconds: 45, order: 1 },
    { exerciseId: 'press', exerciseVersion: 1, name: 'Press', sets: 1, reps: 8, weightKg: 10, restSeconds: 60, order: 2 },
  ],
  adaptations: [],
  reproducibilityHash: 'h',
}

function result(overrides: Partial<SessionResult> = {}): SessionResult {
  return {
    sessionId: 's1',
    planId: 's1',
    status: 'COMPLETED',
    startedAt: '2026-09-01T10:00:00.000Z',
    endedAt: '2026-09-01T10:23:30.000Z',
    totalSetsCompleted: 4,
    totalSetsPlanned: 4,
    ...overrides,
  }
}

let seq = 0
function ev(type: SessionEvent['type'], payload: Record<string, unknown> = {}): SessionEvent {
  seq += 1
  return { seq, eventId: `e${seq}`, sessionId: 's1', type, timestamp: `2026-09-01T10:00:${String(seq).padStart(2, '0')}.000Z`, payload }
}

describe('summarizeSession', () => {
  it('lists every planned exercise in order with its applied sets, and the duration', () => {
    seq = 0
    const events = [
      ev('SESSION_STARTED'),
      ev('SET_COMPLETED', { exerciseId: 'squat', met: true }),
      ev('REST_SKIPPED'),
      ev('SET_COMPLETED', { exerciseId: 'squat', met: false }),
      ev('REST_SKIPPED'),
      ev('SET_COMPLETED', { exerciseId: 'plank' }),
      ev('REST_SKIPPED'),
      ev('SET_COMPLETED', { exerciseId: 'press', met: true, reps: 7, weightKg: 12.5 }),
    ]
    const detail = summarizeSession(plan, result(), events)
    expect(detail.durationMinutes).toBe(24)
    expect(detail.shortened).toBe(false)
    expect(detail.exercises).toEqual([
      {
        exerciseId: 'squat',
        name: 'Squat',
        plannedSets: 2,
        sets: [
          { setNumber: 1, reps: 10, met: true },
          { setNumber: 2, reps: 10, met: false },
        ],
      },
      { exerciseId: 'plank', name: 'Plank', plannedSets: 1, sets: [{ setNumber: 1, seconds: 20, met: true }] },
      { exerciseId: 'press', name: 'Press', plannedSets: 1, sets: [{ setNumber: 1, reps: 7, weightKg: 12.5, met: true }] },
    ])
  })

  it('an ended-early session keeps the exercises it never reached, with no sets', () => {
    seq = 0
    const events = [ev('SESSION_STARTED'), ev('SET_COMPLETED', { exerciseId: 'squat', met: true })]
    const detail = summarizeSession(plan, result({ status: 'COMPLETED_SHORTENED', totalSetsCompleted: 1 }), events)
    expect(detail.shortened).toBe(true)
    expect(detail.exercises.map((e) => [e.exerciseId, e.sets.length])).toEqual([
      ['squat', 1],
      ['plank', 0],
      ['press', 0],
    ])
  })

  it('ignores a stray tap stored mid-rest', () => {
    seq = 0
    const events = [
      ev('SESSION_STARTED'),
      ev('SET_COMPLETED', { exerciseId: 'squat', met: true }),
      ev('SET_COMPLETED', { exerciseId: 'squat', met: false }),
      ev('REST_SKIPPED'),
      ev('SET_COMPLETED', { exerciseId: 'squat', met: true }),
    ]
    const detail = summarizeSession(plan, result({ status: 'COMPLETED_SHORTENED' }), events)
    expect(detail.exercises[0].sets).toEqual([
      { setNumber: 1, reps: 10, met: true },
      { setNumber: 2, reps: 10, met: true },
    ])
  })

  it('never reports a negative or zero duration for a quick session', () => {
    seq = 0
    const detail = summarizeSession(plan, result({ endedAt: '2026-09-01T10:00:20.000Z' }), [ev('SESSION_STARTED')])
    expect(detail.durationMinutes).toBe(1)
  })
})
