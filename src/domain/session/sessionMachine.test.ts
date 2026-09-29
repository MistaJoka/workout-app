import { describe, expect, it } from 'vitest'
import { applyEvent, initSessionState, replayEvents } from './sessionMachine'
import type { SessionEvent, SessionPlan } from './types'

const plan: SessionPlan = {
  id: 'session-1',
  templateId: 'placeholder.test-template',
  templateVersion: 1,
  packId: 'placeholder-pack',
  ruleVersion: 'v0',
  createdAt: '2026-09-13T00:00:00.000Z',
  exercises: [
    { exerciseId: 'ex1', exerciseVersion: 1, name: 'Exercise One', sets: 2, reps: 8, restSeconds: 90, order: 0 },
    { exerciseId: 'ex2', exerciseVersion: 1, name: 'Exercise Two', sets: 1, reps: 10, restSeconds: 60, order: 1 },
  ],
  adaptations: [],
  reproducibilityHash: 'test-hash',
}

function event(partial: Partial<SessionEvent> & Pick<SessionEvent, 'eventId' | 'type'>): SessionEvent {
  return {
    sessionId: plan.id,
    timestamp: '2026-09-13T00:00:00.000Z',
    payload: {},
    ...partial,
  }
}

describe('initSessionState', () => {
  it('starts in DRAFT at exercise 0, set 1, with no applied events', () => {
    expect(initSessionState()).toEqual({
      status: 'DRAFT',
      currentExerciseIndex: 0,
      currentSetNumber: 1,
      restStartedAt: null,
      restEndsAt: null,
      holdStartedAt: null,
      pausedAt: null,
      appliedEventIds: [],
    })
  })
})

describe('applyEvent', () => {
  it('REST_EXTENDED moves the persisted restEndsAt forward by payload.byMs and keeps RESTING', () => {
    const active = applyEvent(plan, initSessionState(), event({ eventId: 'e1', type: 'SESSION_STARTED' }))
    const resting = applyEvent(
      plan,
      active,
      event({ eventId: 'e2', type: 'SET_COMPLETED', timestamp: '2026-09-13T00:01:00.000Z' })
    )
    const extended = applyEvent(
      plan,
      resting,
      event({ eventId: 'e3', type: 'REST_EXTENDED', timestamp: '2026-09-13T00:01:30.000Z', payload: { byMs: 15_000 } })
    )
    expect(extended.status).toBe('RESTING')
    expect(extended.restStartedAt).toBe('2026-09-13T00:01:00.000Z')
    expect(extended.restEndsAt).toBe('2026-09-13T00:02:45.000Z')
    // Replaying the same event id is a no-op, so a double tap adds 15s once.
    expect(applyEvent(plan, extended, event({ eventId: 'e3', type: 'REST_EXTENDED', payload: { byMs: 15_000 } }))).toBe(
      extended
    )
    // Two distinct extensions stack.
    const twice = applyEvent(plan, extended, event({ eventId: 'e4', type: 'REST_EXTENDED', payload: { byMs: 15_000 } }))
    expect(twice.restEndsAt).toBe('2026-09-13T00:03:00.000Z')
  })

  it('REST_EXTENDED outside a rest period changes nothing but is still recorded as applied', () => {
    const active = applyEvent(plan, initSessionState(), event({ eventId: 'e1', type: 'SESSION_STARTED' }))
    const after = applyEvent(plan, active, event({ eventId: 'e2', type: 'REST_EXTENDED', payload: { byMs: 15_000 } }))
    expect(after.status).toBe('ACTIVE')
    expect(after.restEndsAt).toBeNull()
    expect(after.appliedEventIds).toEqual(['e1', 'e2'])
  })

  it('SESSION_STARTED moves DRAFT to ACTIVE', () => {
    const state = applyEvent(plan, initSessionState(), event({ eventId: 'e1', type: 'SESSION_STARTED' }))
    expect(state.status).toBe('ACTIVE')
    expect(state.appliedEventIds).toEqual(['e1'])
  })

  it('SET_COMPLETED on a non-final set moves to RESTING, targeting the next set of the same exercise', () => {
    const active = applyEvent(plan, initSessionState(), event({ eventId: 'e1', type: 'SESSION_STARTED' }))
    const resting = applyEvent(
      plan,
      active,
      event({ eventId: 'e2', type: 'SET_COMPLETED', timestamp: '2026-09-13T00:01:00.000Z' })
    )
    expect(resting.status).toBe('RESTING')
    expect(resting.currentExerciseIndex).toBe(0)
    expect(resting.currentSetNumber).toBe(2)
    expect(resting.restStartedAt).toBe('2026-09-13T00:01:00.000Z')
    expect(resting.restEndsAt).toBe('2026-09-13T00:02:30.000Z')
  })

  it('SET_COMPLETED on the last set of an exercise advances to the next exercise', () => {
    let state = applyEvent(plan, initSessionState(), event({ eventId: 'e1', type: 'SESSION_STARTED' }))
    state = applyEvent(plan, state, event({ eventId: 'e2', type: 'SET_COMPLETED' }))
    state = applyEvent(plan, state, event({ eventId: 'e3', type: 'REST_ENDED' }))
    state = applyEvent(plan, state, event({ eventId: 'e4', type: 'SET_COMPLETED' }))
    expect(state.status).toBe('RESTING')
    expect(state.currentExerciseIndex).toBe(1)
    expect(state.currentSetNumber).toBe(1)
  })

  it('SET_COMPLETED on the last set of the last exercise completes the session', () => {
    let state = applyEvent(plan, initSessionState(), event({ eventId: 'e1', type: 'SESSION_STARTED' }))
    state = applyEvent(plan, state, event({ eventId: 'e2', type: 'SET_COMPLETED' }))
    state = applyEvent(plan, state, event({ eventId: 'e3', type: 'REST_ENDED' }))
    state = applyEvent(plan, state, event({ eventId: 'e4', type: 'SET_COMPLETED' }))
    state = applyEvent(plan, state, event({ eventId: 'e5', type: 'REST_ENDED' }))
    state = applyEvent(plan, state, event({ eventId: 'e6', type: 'SET_COMPLETED' }))
    expect(state.status).toBe('COMPLETED')
  })

  it('SET_COMPLETED outside an active set (resting, paused, draft, finished) changes nothing but is recorded', () => {
    const active = applyEvent(plan, initSessionState(), event({ eventId: 'e1', type: 'SESSION_STARTED' }))
    const resting = applyEvent(plan, active, event({ eventId: 'e2', type: 'SET_COMPLETED' }))
    // A second tap with a fresh event id lands mid-rest: it must not skip a set.
    const stray = applyEvent(plan, resting, event({ eventId: 'e3', type: 'SET_COMPLETED' }))
    expect(stray).toEqual({ ...resting, appliedEventIds: ['e1', 'e2', 'e3'] })

    const paused = applyEvent(plan, active, event({ eventId: 'p1', type: 'PAUSED' }))
    expect(applyEvent(plan, paused, event({ eventId: 'p2', type: 'SET_COMPLETED' })).status).toBe('PAUSED')

    const draft = applyEvent(plan, initSessionState(), event({ eventId: 'd1', type: 'SET_COMPLETED' }))
    expect(draft.status).toBe('DRAFT')
    expect(draft.currentSetNumber).toBe(1)

    const ended = applyEvent(plan, active, event({ eventId: 'x1', type: 'SESSION_COMPLETED_SHORTENED' }))
    expect(applyEvent(plan, ended, event({ eventId: 'x2', type: 'SET_COMPLETED' })).status).toBe('COMPLETED_SHORTENED')
  })

  it('REST_ENDED and REST_SKIPPED both clear rest and move to ACTIVE', () => {
    let state = applyEvent(plan, initSessionState(), event({ eventId: 'e1', type: 'SESSION_STARTED' }))
    state = applyEvent(plan, state, event({ eventId: 'e2', type: 'SET_COMPLETED' }))
    const viaEnded = applyEvent(plan, state, event({ eventId: 'e3', type: 'REST_ENDED' }))
    const viaSkipped = applyEvent(plan, state, event({ eventId: 'e3b', type: 'REST_SKIPPED' }))
    expect(viaEnded.status).toBe('ACTIVE')
    expect(viaEnded.restStartedAt).toBeNull()
    expect(viaEnded.restEndsAt).toBeNull()
    expect(viaSkipped.status).toBe('ACTIVE')
    expect(viaSkipped.currentSetNumber).toBe(viaEnded.currentSetNumber)
  })

  it('PAUSED then RESUMED returns to ACTIVE when not resting', () => {
    let state = applyEvent(plan, initSessionState(), event({ eventId: 'e1', type: 'SESSION_STARTED' }))
    state = applyEvent(plan, state, event({ eventId: 'e2', type: 'PAUSED' }))
    expect(state.status).toBe('PAUSED')
    state = applyEvent(plan, state, event({ eventId: 'e3', type: 'RESUMED' }))
    expect(state.status).toBe('ACTIVE')
  })

  it('PAUSED then RESUMED returns to RESTING when a rest was in progress', () => {
    let state = applyEvent(plan, initSessionState(), event({ eventId: 'e1', type: 'SESSION_STARTED' }))
    state = applyEvent(plan, state, event({ eventId: 'e2', type: 'SET_COMPLETED' }))
    state = applyEvent(plan, state, event({ eventId: 'e3', type: 'PAUSED' }))
    state = applyEvent(plan, state, event({ eventId: 'e4', type: 'RESUMED' }))
    expect(state.status).toBe('RESTING')
  })

  it('SESSION_COMPLETED_SHORTENED marks the session shortened from any active phase', () => {
    let state = applyEvent(plan, initSessionState(), event({ eventId: 'e1', type: 'SESSION_STARTED' }))
    state = applyEvent(plan, state, event({ eventId: 'e2', type: 'SESSION_COMPLETED_SHORTENED' }))
    expect(state.status).toBe('COMPLETED_SHORTENED')
  })

  it('is idempotent: applying the same eventId twice has no additional effect', () => {
    const active = applyEvent(plan, initSessionState(), event({ eventId: 'e1', type: 'SESSION_STARTED' }))
    const once = applyEvent(plan, active, event({ eventId: 'e2', type: 'SET_COMPLETED' }))
    const twice = applyEvent(plan, once, event({ eventId: 'e2', type: 'SET_COMPLETED' }))
    expect(twice).toEqual(once)
  })
})

describe('replayEvents', () => {
  it('folds a full event log into the same state as sequential applyEvent calls', () => {
    const events: SessionEvent[] = [
      event({ eventId: 'e1', type: 'SESSION_STARTED' }),
      event({ eventId: 'e2', type: 'SET_COMPLETED' }),
      event({ eventId: 'e3', type: 'REST_ENDED' }),
    ]
    const replayed = replayEvents(plan, events)
    let manual = initSessionState()
    for (const e of events) {
      manual = applyEvent(plan, manual, e)
    }
    expect(replayed).toEqual(manual)
  })
})

const timedPlan: SessionPlan = {
  ...plan,
  id: 'session-timed',
  exercises: [
    { exerciseId: 'plank', exerciseVersion: 1, name: 'Plank', sets: 2, timeSeconds: 20, restSeconds: 30, order: 0 },
    { exerciseId: 'ex2', exerciseVersion: 1, name: 'Exercise Two', sets: 1, reps: 10, restSeconds: 60, order: 1 },
  ],
}

const at = (seconds: number) => new Date(Date.parse('2026-09-13T00:00:00.000Z') + seconds * 1000).toISOString()

describe('holds (HOLD_STARTED)', () => {
  it('starts a hold on an active timed set, keeps the first start, and clears on SET_COMPLETED', () => {
    let state = applyEvent(timedPlan, initSessionState(), event({ eventId: 'e1', type: 'SESSION_STARTED' }))
    state = applyEvent(timedPlan, state, event({ eventId: 'h1', type: 'HOLD_STARTED', timestamp: at(5) }))
    expect(state.holdStartedAt).toBe(at(5))
    // A second tap doesn't restart the clock.
    state = applyEvent(timedPlan, state, event({ eventId: 'h2', type: 'HOLD_STARTED', timestamp: at(9) }))
    expect(state.holdStartedAt).toBe(at(5))
    state = applyEvent(timedPlan, state, event({ eventId: 'e2', type: 'SET_COMPLETED', timestamp: at(25) }))
    expect(state.status).toBe('RESTING')
    expect(state.holdStartedAt).toBeNull()
  })

  it('is ignored on a reps set or outside an active set', () => {
    const active = applyEvent(plan, initSessionState(), event({ eventId: 'e1', type: 'SESSION_STARTED' }))
    expect(applyEvent(plan, active, event({ eventId: 'h1', type: 'HOLD_STARTED' })).holdStartedAt).toBeNull()
    const draft = applyEvent(timedPlan, initSessionState(), event({ eventId: 'h1', type: 'HOLD_STARTED' }))
    expect(draft.holdStartedAt).toBeNull()
  })
})

describe('skipping a move (EXERCISE_SKIPPED)', () => {
  it('moves from any set of the current move to set 1 of the next, with no rest', () => {
    let state = applyEvent(plan, initSessionState(), event({ eventId: 'e1', type: 'SESSION_STARTED' }))
    state = applyEvent(plan, state, event({ eventId: 's1', type: 'EXERCISE_SKIPPED' }))
    expect(state).toMatchObject({ status: 'ACTIVE', currentExerciseIndex: 1, currentSetNumber: 1, restEndsAt: null })
  })

  it('skipping the last move finishes the workout', () => {
    let state = applyEvent(plan, initSessionState(), event({ eventId: 'e1', type: 'SESSION_STARTED' }))
    state = applyEvent(plan, state, event({ eventId: 's1', type: 'EXERCISE_SKIPPED' }))
    state = applyEvent(plan, state, event({ eventId: 's2', type: 'EXERCISE_SKIPPED' }))
    expect(state.status).toBe('COMPLETED')
  })

  it('clears a running hold and is ignored while resting', () => {
    let state = applyEvent(timedPlan, initSessionState(), event({ eventId: 'e1', type: 'SESSION_STARTED' }))
    state = applyEvent(timedPlan, state, event({ eventId: 'h1', type: 'HOLD_STARTED' }))
    state = applyEvent(timedPlan, state, event({ eventId: 's1', type: 'EXERCISE_SKIPPED' }))
    expect(state.holdStartedAt).toBeNull()
    expect(state.currentExerciseIndex).toBe(1)

    let resting = applyEvent(plan, initSessionState(), event({ eventId: 'e1', type: 'SESSION_STARTED' }))
    resting = applyEvent(plan, resting, event({ eventId: 'e2', type: 'SET_COMPLETED' }))
    const after = applyEvent(plan, resting, event({ eventId: 's1', type: 'EXERCISE_SKIPPED' }))
    expect(after).toEqual({ ...resting, appliedEventIds: [...resting.appliedEventIds, 's1'] })
  })
})

describe('pause freezes the clocks', () => {
  it('a rest paused for 100s ends 100s later', () => {
    let state = applyEvent(plan, initSessionState(), event({ eventId: 'e1', type: 'SESSION_STARTED' }))
    state = applyEvent(plan, state, event({ eventId: 'e2', type: 'SET_COMPLETED', timestamp: at(0) }))
    expect(state.restEndsAt).toBe(at(90))
    state = applyEvent(plan, state, event({ eventId: 'p1', type: 'PAUSED', timestamp: at(30) }))
    state = applyEvent(plan, state, event({ eventId: 'r1', type: 'RESUMED', timestamp: at(130) }))
    expect(state.status).toBe('RESTING')
    expect(state.restStartedAt).toBe(at(100))
    expect(state.restEndsAt).toBe(at(190))
  })

  it('a hold paused for 60s keeps the time it had left', () => {
    let state = applyEvent(timedPlan, initSessionState(), event({ eventId: 'e1', type: 'SESSION_STARTED' }))
    state = applyEvent(timedPlan, state, event({ eventId: 'h1', type: 'HOLD_STARTED', timestamp: at(0) }))
    state = applyEvent(timedPlan, state, event({ eventId: 'p1', type: 'PAUSED', timestamp: at(8) }))
    state = applyEvent(timedPlan, state, event({ eventId: 'r1', type: 'RESUMED', timestamp: at(68) }))
    expect(state.status).toBe('ACTIVE')
    expect(state.holdStartedAt).toBe(at(60))
  })
})

describe('status guards', () => {
  it('nothing reopens a finished session', () => {
    let state = applyEvent(plan, initSessionState(), event({ eventId: 'e1', type: 'SESSION_STARTED' }))
    state = applyEvent(plan, state, event({ eventId: 'x1', type: 'SESSION_COMPLETED_SHORTENED' }))
    for (const type of ['PAUSED', 'RESUMED', 'SESSION_COMPLETED', 'REST_ENDED', 'REST_SKIPPED', 'EXERCISE_SKIPPED'] as const) {
      expect(applyEvent(plan, state, event({ eventId: `g-${type}`, type })).status).toBe('COMPLETED_SHORTENED')
    }
  })

  it('RESUMED without a pause and REST_ENDED outside a rest change nothing', () => {
    const active = applyEvent(plan, initSessionState(), event({ eventId: 'e1', type: 'SESSION_STARTED' }))
    expect(applyEvent(plan, active, event({ eventId: 'r1', type: 'RESUMED' }))).toMatchObject({ status: 'ACTIVE' })
    let resting = applyEvent(plan, active, event({ eventId: 'e2', type: 'SET_COMPLETED' }))
    resting = applyEvent(plan, resting, event({ eventId: 'p1', type: 'PAUSED' }))
    // A rest-end that lands while paused must not unpause.
    expect(applyEvent(plan, resting, event({ eventId: 'x', type: 'REST_ENDED' })).status).toBe('PAUSED')
  })
})
