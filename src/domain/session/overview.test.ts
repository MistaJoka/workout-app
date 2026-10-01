import { describe, expect, it } from 'vitest'
import { workoutOverview } from './overview'
import { applyEvent, initSessionState } from './sessionMachine'
import type { SessionEvent, SessionPlan } from './types'

const plan: SessionPlan = {
  id: 's1',
  templateId: 't',
  templateVersion: 1,
  packId: 'p',
  ruleVersion: 'v1',
  createdAt: '2026-09-30T10:00:00.000Z',
  exercises: [
    { exerciseId: 'squat', exerciseVersion: 1, name: 'Squat', sets: 2, reps: 10, restSeconds: 45, order: 0 },
    { exerciseId: 'pushup', exerciseVersion: 1, name: 'Push-Up', sets: 2, reps: 8, restSeconds: 45, order: 1 },
    { exerciseId: 'plank', exerciseVersion: 1, name: 'Plank', sets: 1, timeSeconds: 20, restSeconds: 45, order: 2 },
    { exerciseId: 'bridge', exerciseVersion: 1, name: 'Bridge', sets: 2, reps: 10, restSeconds: 45, order: 3 },
  ],
  adaptations: [],
  reproducibilityHash: 'h',
}

let seq = 0
function ev(type: SessionEvent['type'], payload: Record<string, unknown> = {}): SessionEvent {
  seq += 1
  return { seq, eventId: `e${seq}`, sessionId: 's1', type, timestamp: `2026-09-30T10:00:${String(seq).padStart(2, '0')}.000Z`, payload }
}

function replay(events: SessionEvent[]) {
  return events.reduce((state, event) => applyEvent(plan, state, event), initSessionState())
}

describe('workoutOverview', () => {
  it('marks the first move current and the next one up next at the start', () => {
    const events = [ev('SESSION_STARTED')]
    const items = workoutOverview(plan, events, replay(events))
    expect(items.map((i) => [i.exerciseId, i.status, i.doneSets, i.plannedSets])).toEqual([
      ['squat', 'current', 0, 2],
      ['pushup', 'next', 0, 2],
      ['plank', 'later', 0, 1],
      ['bridge', 'later', 0, 2],
    ])
  })

  it('counts applied sets per move and marks finished moves done', () => {
    const events = [
      ev('SESSION_STARTED'),
      ev('SET_COMPLETED', { exerciseId: 'squat', met: true }),
      ev('REST_SKIPPED'),
      ev('SET_COMPLETED', { exerciseId: 'squat', met: true }),
      ev('SET_COMPLETED', { exerciseId: 'squat', met: true }), // stray, mid-rest
      ev('REST_SKIPPED'),
      ev('SET_COMPLETED', { exerciseId: 'pushup', met: true }),
    ]
    const items = workoutOverview(plan, events, replay(events))
    expect(items.map((i) => [i.exerciseId, i.status, i.doneSets])).toEqual([
      ['squat', 'done', 2],
      ['pushup', 'current', 1],
      ['plank', 'next', 0],
      ['bridge', 'later', 0],
    ])
  })

  it('marks a skipped move skipped, even with some of its sets done', () => {
    const events = [
      ev('SESSION_STARTED'),
      ev('SET_COMPLETED', { exerciseId: 'squat', met: true }),
      ev('REST_SKIPPED'),
      ev('EXERCISE_SKIPPED'),
      ev('EXERCISE_SKIPPED'),
    ]
    const items = workoutOverview(plan, events, replay(events))
    expect(items.map((i) => [i.exerciseId, i.status, i.doneSets])).toEqual([
      ['squat', 'skipped', 1],
      ['pushup', 'skipped', 0],
      ['plank', 'current', 0],
      ['bridge', 'next', 0],
    ])
  })

  it('has no current move once the workout is over', () => {
    const events = [ev('SESSION_STARTED'), ev('SET_COMPLETED', { exerciseId: 'squat', met: true }), ev('SESSION_COMPLETED_SHORTENED')]
    const items = workoutOverview(plan, events, replay(events))
    expect(items.map((i) => i.status)).toEqual(['done', 'later', 'later', 'later'])
  })
})
