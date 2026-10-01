import { effectiveSetSlots } from './appliedEvents'
import { applyEvent, initSessionState } from './sessionMachine'
import type { SessionEvent, SessionPlan, SessionState } from './types'

export type OverviewStatus = 'done' | 'current' | 'skipped' | 'next' | 'later'

export type OverviewItem = {
  index: number
  exerciseId: string
  name: string
  plannedSets: number
  doneSets: number
  status: OverviewStatus
}

// The whole workout at a glance, for the player's overview sheet: every
// planned move in order with the sets that counted (effectiveSetSlots, so a
// stray tap never shows as an extra set) and where it stands. View-only:
// the order is part of the immutable plan.
export function workoutOverview(plan: SessionPlan, events: readonly SessionEvent[], state: SessionState): OverviewItem[] {
  const done = new Map<number, number>()
  for (const slot of effectiveSetSlots(plan, events)) done.set(slot.exerciseIndex, (done.get(slot.exerciseIndex) ?? 0) + 1)
  const skipped = skippedIndexes(plan, events)
  const over = state.status === 'COMPLETED' || state.status === 'COMPLETED_SHORTENED'
  const current = state.currentExerciseIndex

  return plan.exercises.map((exercise, index) => {
    const doneSets = done.get(index) ?? 0
    let status: OverviewStatus
    if (skipped.has(index)) status = 'skipped'
    else if (over) status = doneSets > 0 ? 'done' : 'later'
    else if (index < current) status = 'done'
    else if (index === current) status = 'current'
    else if (index === current + 1) status = 'next'
    else status = 'later'
    return { index, exerciseId: exercise.exerciseId, name: exercise.name, plannedSets: exercise.sets, doneSets, status }
  })
}

// Plan indexes of the moves the session was on when an EXERCISE_SKIPPED
// applied (replayed in order through the machine).
function skippedIndexes(plan: SessionPlan, events: readonly SessionEvent[]): Set<number> {
  const ordered = [...events].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0) || a.timestamp.localeCompare(b.timestamp))
  const indexes = new Set<number>()
  let state = initSessionState()
  for (const event of ordered) {
    const next = applyEvent(plan, state, event)
    const moved = next.currentExerciseIndex !== state.currentExerciseIndex || next.status !== state.status
    if (event.type === 'EXERCISE_SKIPPED' && moved) indexes.add(state.currentExerciseIndex)
    state = next
  }
  return indexes
}
