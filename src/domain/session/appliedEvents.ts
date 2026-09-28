import { applyEvent, initSessionState } from './sessionMachine'
import type { SessionEvent, SessionPlan, SessionState } from './types'

// Stored events are not all effective: a double-tap race can store a second
// SET_COMPLETED after the session already finished, and the session machine
// ignores a set logged outside ACTIVE. Anything that counts sets (the
// session result, progression, familiarity) must count only the sets the
// machine actually applied, or totals and progression get inflated.
//
// Replays through the machine itself and keeps a SET_COMPLETED only if it
// changed where the session is (set pointer or status), so this stays
// right whatever the machine's acceptance rules are.
export function withoutIneffectiveSets(plan: SessionPlan, events: SessionEvent[]): SessionEvent[] {
  let state = initSessionState()
  const kept: SessionEvent[] = []
  for (const event of events) {
    const next = applyEvent(plan, state, event)
    if (event.type !== 'SET_COMPLETED' || moved(state, next)) kept.push(event)
    state = next
  }
  return kept
}

function moved(before: SessionState, after: SessionState): boolean {
  return (
    before.status !== after.status ||
    before.currentExerciseIndex !== after.currentExerciseIndex ||
    before.currentSetNumber !== after.currentSetNumber
  )
}
