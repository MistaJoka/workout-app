import { describe, expect, it } from 'vitest'
import { effectiveSetSlots, withoutIneffectiveSets } from './appliedEvents'
import type { SessionEvent, SessionPlan } from './types'

const plan: SessionPlan = {
  id: 's',
  templateId: 't',
  templateVersion: 1,
  packId: 'p',
  ruleVersion: 'v0',
  createdAt: '2026-09-13T00:00:00.000Z',
  exercises: [{ exerciseId: 'ex1', exerciseVersion: 1, name: 'One', sets: 2, reps: 10, restSeconds: 60, order: 0 }],
  adaptations: [],
  reproducibilityHash: 'h',
}

let n = 0
const ev = (type: SessionEvent['type'], eventId = `e${n++}`): SessionEvent => ({
  eventId,
  sessionId: 's',
  type,
  timestamp: `2026-09-13T00:00:${String(n).padStart(2, '0')}.000Z`,
  payload: { exerciseId: 'ex1', met: true },
})

describe('withoutIneffectiveSets', () => {
  it('keeps every set that moved the session forward', () => {
    const events = [ev('SESSION_STARTED'), ev('SET_COMPLETED'), ev('REST_SKIPPED'), ev('SET_COMPLETED')]
    expect(withoutIneffectiveSets(plan, events)).toEqual(events)
  })

  it('drops a stray set logged after the session already finished (double-tap race)', () => {
    const events = [ev('SESSION_STARTED'), ev('SET_COMPLETED'), ev('REST_SKIPPED'), ev('SET_COMPLETED')]
    const stray = ev('SET_COMPLETED')
    expect(withoutIneffectiveSets(plan, [...events, stray])).toEqual(events)
  })

  it('drops a replayed duplicate eventId', () => {
    const set = ev('SET_COMPLETED', 'dup')
    const events = [ev('SESSION_STARTED'), set]
    expect(withoutIneffectiveSets(plan, [...events, { ...set }])).toEqual(events)
  })

  it('leaves non-set events alone', () => {
    const events = [ev('SESSION_STARTED'), ev('PAUSED'), ev('RESUMED')]
    expect(withoutIneffectiveSets(plan, events)).toEqual(events)
  })
})

describe('effectiveSetSlots', () => {
  const two: SessionPlan = {
    ...plan,
    exercises: [
      { exerciseId: 'ex1', exerciseVersion: 1, name: 'One', sets: 2, reps: 10, restSeconds: 60, order: 0 },
      { exerciseId: 'ex2', exerciseVersion: 1, name: 'Two', sets: 2, reps: 10, restSeconds: 60, order: 1 },
    ],
  }

  it('gives each counted set the move and set number it was done for', () => {
    const events = [ev('SESSION_STARTED'), ev('SET_COMPLETED'), ev('REST_SKIPPED'), ev('EXERCISE_SKIPPED'), ev('SET_COMPLETED')]
    expect(effectiveSetSlots(two, events).map((s) => [s.exerciseIndex, s.setNumber])).toEqual([
      [0, 1],
      [1, 1],
    ])
  })

  it('falls back to plan order for hand-built history with no start event', () => {
    const events = [ev('SET_COMPLETED'), ev('SET_COMPLETED'), ev('SET_COMPLETED')]
    expect(effectiveSetSlots(two, events).map((s) => [s.exerciseIndex, s.setNumber])).toEqual([
      [0, 1],
      [0, 2],
      [1, 1],
    ])
  })
})
