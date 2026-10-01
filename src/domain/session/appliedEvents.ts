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
//
// An applied SET_UNDONE takes back the last counted set: that SET_COMPLETED
// is dropped too, so an undone mis-tap never counts anywhere.
export function withoutIneffectiveSets(plan: SessionPlan, events: SessionEvent[]): SessionEvent[] {
  let state = initSessionState()
  const kept: SessionEvent[] = []
  for (const event of events) {
    const next = applyEvent(plan, state, event)
    if (event.type === 'SET_UNDONE' && moved(state, next)) {
      const last = kept.map((e) => e.type).lastIndexOf('SET_COMPLETED')
      if (last >= 0) kept.splice(last, 1)
    } else if (event.type !== 'SET_COMPLETED' || moved(state, next)) {
      kept.push(event)
    }
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

function inOrder(sessionEvents: readonly SessionEvent[]): SessionEvent[] {
  return [...sessionEvents].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0) || a.timestamp.localeCompare(b.timestamp))
}

// The SET_COMPLETED events that counted, in order, for one session's
// events. Sessions stored without a SESSION_STARTED (hand-built history)
// can't be replayed, so their sets are taken as recorded.
export function effectiveSets(plan: SessionPlan, sessionEvents: readonly SessionEvent[]): SessionEvent[] {
  return effectiveSetSlots(plan, sessionEvents).map((slot) => slot.event)
}

export type SetSlot = { event: SessionEvent; exerciseIndex: number; setNumber: number }

// Each counted set with the move and set number it was done for — read from
// the session's own pointer at the moment it applied, so a skipped move
// (EXERCISE_SKIPPED) doesn't shift later sets onto the wrong exercise.
// History with no start event can't be replayed; its sets fill the plan's
// slots in order.
export function effectiveSetSlots(plan: SessionPlan, sessionEvents: readonly SessionEvent[]): SetSlot[] {
  const ordered = inOrder(sessionEvents)
  if (!ordered.some((e) => e.type === 'SESSION_STARTED')) {
    const slots = plan.exercises.flatMap((exercise, exerciseIndex) =>
      Array.from({ length: exercise.sets }, (_, i) => ({ exerciseIndex, setNumber: i + 1 }))
    )
    return ordered
      .filter((e) => e.type === 'SET_COMPLETED')
      .slice(0, slots.length)
      .map((event, i) => ({ event, ...slots[i] }))
  }
  let state = initSessionState()
  const out: SetSlot[] = []
  for (const event of ordered) {
    const next = applyEvent(plan, state, event)
    if (event.type === 'SET_COMPLETED' && moved(state, next)) {
      out.push({ event, exerciseIndex: state.currentExerciseIndex, setNumber: state.currentSetNumber })
    } else if (event.type === 'SET_UNDONE' && moved(state, next)) {
      out.pop()
    }
    state = next
  }
  return out
}
