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
