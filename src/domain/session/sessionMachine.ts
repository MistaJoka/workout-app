import type { SessionEvent, SessionPlan, SessionState } from './types'

export function initSessionState(): SessionState {
  return {
    status: 'DRAFT',
    currentExerciseIndex: 0,
    currentSetNumber: 1,
    restStartedAt: null,
    restEndsAt: null,
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

export function applyEvent(plan: SessionPlan, state: SessionState, event: SessionEvent): SessionState {
  if (state.appliedEventIds.includes(event.eventId)) {
    return state
  }
  const appliedEventIds = [...state.appliedEventIds, event.eventId]

  switch (event.type) {
    case 'SESSION_STARTED':
      return { ...state, status: 'ACTIVE', appliedEventIds }

    case 'SET_COMPLETED': {
      // Only a set being worked on can complete. Each tap mints a fresh
      // event id, so a stray second tap that lands mid-rest (or after the
      // end) must be recorded but must not skip the next set.
      if (state.status !== 'ACTIVE') return { ...state, appliedEventIds }
      const next = nextPointer(plan, state.currentExerciseIndex, state.currentSetNumber)
      if (next === null) {
        return { ...state, status: 'COMPLETED', restStartedAt: null, restEndsAt: null, appliedEventIds }
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
        appliedEventIds,
      }
    }

    case 'REST_EXTENDED': {
      // Only meaningful mid-rest; elsewhere it's recorded (idempotency) but
      // changes nothing. Extensions stack, each under its own event id.
      if (state.status !== 'RESTING' || !state.restEndsAt) return { ...state, appliedEventIds }
      const byMs = typeof event.payload.byMs === 'number' && event.payload.byMs > 0 ? event.payload.byMs : 0
      const restEndsAt = new Date(new Date(state.restEndsAt).getTime() + byMs).toISOString()
      return { ...state, restEndsAt, appliedEventIds }
    }

    case 'REST_ENDED':
    case 'REST_SKIPPED':
      return { ...state, status: 'ACTIVE', restStartedAt: null, restEndsAt: null, appliedEventIds }

    case 'PAUSED':
      return { ...state, status: 'PAUSED', appliedEventIds }

    case 'RESUMED':
      return { ...state, status: state.restStartedAt ? 'RESTING' : 'ACTIVE', appliedEventIds }

    case 'SESSION_COMPLETED':
      return { ...state, status: 'COMPLETED', appliedEventIds }

    case 'SESSION_COMPLETED_SHORTENED':
      return { ...state, status: 'COMPLETED_SHORTENED', appliedEventIds }

    default:
      return { ...state, appliedEventIds }
  }
}

export function replayEvents(plan: SessionPlan, events: SessionEvent[]): SessionState {
  return events.reduce((state, event) => applyEvent(plan, state, event), initSessionState())
}
