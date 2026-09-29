import type { SessionEvent, SessionPlan, SessionState, SessionStatus } from './types'

export function initSessionState(): SessionState {
  return {
    status: 'DRAFT',
    currentExerciseIndex: 0,
    currentSetNumber: 1,
    restStartedAt: null,
    restEndsAt: null,
    holdStartedAt: null,
    pausedAt: null,
    appliedEventIds: [],
  }
}

function nextPointer(
  plan: SessionPlan,
  exerciseIndex: number,
  setNumber: number
): { exerciseIndex: number; setNumber: number } | null {
  const exercise = plan.exercises[exerciseIndex]
  if (setNumber < exercise.sets) {
    return { exerciseIndex, setNumber: setNumber + 1 }
  }
  if (exerciseIndex + 1 < plan.exercises.length) {
    return { exerciseIndex: exerciseIndex + 1, setNumber: 1 }
  }
  return null
}

function isFinished(status: SessionStatus): boolean {
  return status === 'COMPLETED' || status === 'COMPLETED_SHORTENED'
}

function shift(iso: string | null, byMs: number): string | null {
  return iso === null ? null : new Date(Date.parse(iso) + byMs).toISOString()
}

export function applyEvent(plan: SessionPlan, state: SessionState, event: SessionEvent): SessionState {
  if (state.appliedEventIds.includes(event.eventId)) {
    return state
  }
  const appliedEventIds = [...state.appliedEventIds, event.eventId]
  // Every event is recorded as applied (idempotency), but one that doesn't
  // fit the current status changes nothing else: a stray tap, a timer that
  // fires late, or anything stored after the session finished.
  const ignore = { ...state, appliedEventIds }

  switch (event.type) {
    case 'SESSION_STARTED':
      return { ...state, status: 'ACTIVE', appliedEventIds }

    case 'SET_COMPLETED': {
      // Only a set being worked on can complete. Each tap mints a fresh
      // event id, so a stray second tap that lands mid-rest (or after the
      // end) must be recorded but must not skip the next set.
      if (state.status !== 'ACTIVE') return ignore
      const next = nextPointer(plan, state.currentExerciseIndex, state.currentSetNumber)
      if (next === null) {
        return { ...state, status: 'COMPLETED', restStartedAt: null, restEndsAt: null, holdStartedAt: null, appliedEventIds }
      }
      const restSeconds = plan.exercises[state.currentExerciseIndex].restSeconds
      const restStartedAt = event.timestamp
      const restEndsAt = new Date(new Date(restStartedAt).getTime() + restSeconds * 1000).toISOString()
      return {
        ...state,
        status: 'RESTING',
        currentExerciseIndex: next.exerciseIndex,
        currentSetNumber: next.setNumber,
        restStartedAt,
        restEndsAt,
        holdStartedAt: null,
        appliedEventIds,
      }
    }

    case 'HOLD_STARTED': {
      // Only a timed set being worked on, and a second tap keeps the first
      // start (the clock never restarts under the user).
      const exercise = plan.exercises[state.currentExerciseIndex]
      if (state.status !== 'ACTIVE' || exercise?.timeSeconds == null || state.holdStartedAt !== null) return ignore
      return { ...state, holdStartedAt: event.timestamp, appliedEventIds }
    }

    case 'EXERCISE_SKIPPED': {
      // The rest of this move's sets stay undone; the next move starts at
      // set 1 with no rest. Skipping the last move ends the workout.
      if (state.status !== 'ACTIVE') return ignore
      const nextIndex = state.currentExerciseIndex + 1
      if (nextIndex >= plan.exercises.length) {
        return { ...state, status: 'COMPLETED', restStartedAt: null, restEndsAt: null, holdStartedAt: null, appliedEventIds }
      }
      return { ...state, currentExerciseIndex: nextIndex, currentSetNumber: 1, holdStartedAt: null, appliedEventIds }
    }

    case 'REST_EXTENDED': {
      // Only meaningful mid-rest; elsewhere it's recorded (idempotency) but
      // changes nothing. Extensions stack, each under its own event id.
      if (state.status !== 'RESTING' || !state.restEndsAt) return ignore
      const byMs = typeof event.payload.byMs === 'number' && event.payload.byMs > 0 ? event.payload.byMs : 0
      const restEndsAt = new Date(new Date(state.restEndsAt).getTime() + byMs).toISOString()
      return { ...state, restEndsAt, appliedEventIds }
    }

    case 'REST_ENDED':
    case 'REST_SKIPPED':
      // A rest timer that fires while paused (or late, after the end) must
      // not unpause or reopen anything.
      if (state.status !== 'RESTING') return ignore
      return { ...state, status: 'ACTIVE', restStartedAt: null, restEndsAt: null, appliedEventIds }

    case 'PAUSED':
      if (state.status !== 'ACTIVE' && state.status !== 'RESTING') return ignore
      return { ...state, status: 'PAUSED', pausedAt: event.timestamp, appliedEventIds }

    case 'RESUMED': {
      // Clocks freeze while paused: a running rest or hold picks up with
      // the time it had left, not with whatever passed during the pause.
      if (state.status !== 'PAUSED') return ignore
      const pausedMs = state.pausedAt ? Math.max(0, Date.parse(event.timestamp) - Date.parse(state.pausedAt)) : 0
      return {
        ...state,
        status: state.restStartedAt ? 'RESTING' : 'ACTIVE',
        restStartedAt: shift(state.restStartedAt, pausedMs),
        restEndsAt: shift(state.restEndsAt, pausedMs),
        holdStartedAt: shift(state.holdStartedAt, pausedMs),
        pausedAt: null,
        appliedEventIds,
      }
    }

    case 'SESSION_COMPLETED':
      if (isFinished(state.status)) return ignore
      return { ...state, status: 'COMPLETED', appliedEventIds }

    case 'SESSION_COMPLETED_SHORTENED':
      if (isFinished(state.status)) return ignore
      return { ...state, status: 'COMPLETED_SHORTENED', appliedEventIds }

    default:
      return ignore
  }
}

export function replayEvents(plan: SessionPlan, events: SessionEvent[]): SessionState {
  return events.reduce((state, event) => applyEvent(plan, state, event), initSessionState())
}
