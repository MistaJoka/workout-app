import type { SessionEvent, SessionPlan, SessionResult } from '../session/types'
import { projectSetRecords } from './history'
import { applyEvent, initSessionState } from '../session/sessionMachine'

export type SessionDetailSet = {
  setNumber: number
  reps?: number
  seconds?: number
  weightKg?: number
  met: boolean
}

export type SessionDetailExercise = {
  exerciseId: string
  name: string
  plannedSets: number
  sets: SessionDetailSet[]
  // The user chose "Skip this move" while on it (EXERCISE_SKIPPED).
  skipped: boolean
}

export type SessionDetail = {
  durationMinutes: number
  shortened: boolean
  exercises: SessionDetailExercise[]
}

// One finished session, read back for the history detail screen. Built on
// projectSetRecords, so it counts only the sets the session machine applied
// (a stray tap mid-rest never shows up as an extra set). Every planned
// exercise is listed in plan order, including ones an early end never
// reached, so the page matches what the workout asked for.
export function summarizeSession(plan: SessionPlan, result: SessionResult, events: readonly SessionEvent[]): SessionDetail {
  const records = projectSetRecords([plan], [result], events)
  const skipped = skippedExerciseIndexes(plan, events)
  const elapsedMs = new Date(result.endedAt).getTime() - new Date(result.startedAt).getTime()
  return {
    durationMinutes: Math.max(1, Math.round(elapsedMs / 60_000)),
    shortened: result.status === 'COMPLETED_SHORTENED',
    exercises: [...plan.exercises]
      .sort((a, b) => a.order - b.order)
      .map((exercise) => ({
        skipped: skipped.has(plan.exercises.indexOf(exercise)),
        exerciseId: exercise.exerciseId,
        name: exercise.name,
        plannedSets: exercise.sets,
        sets: records
          .filter((r) => r.exerciseId === exercise.exerciseId)
          .map((r) => {
            const reps = r.performedReps ?? r.prescribedReps
            return {
              setNumber: r.setNumber,
              ...(reps != null ? { reps } : {}),
              ...(reps == null && r.prescribedSeconds != null ? { seconds: r.prescribedSeconds } : {}),
              ...(r.weight != null ? { weightKg: r.weight } : {}),
              met: r.met,
            }
          }),
      })),
  }
}

// Plan indexes of the moves the machine was on when an EXERCISE_SKIPPED was
// applied, found by replaying the session's events in order.
function skippedExerciseIndexes(plan: SessionPlan, events: readonly SessionEvent[]): Set<number> {
  const ordered = [...events].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0) || a.timestamp.localeCompare(b.timestamp))
  const indexes = new Set<number>()
  let state = initSessionState()
  for (const event of ordered) {
    const next = applyEvent(plan, state, event)
    const moved = next.currentExerciseIndex !== state.currentExerciseIndex || next.status !== state.status
    if (event.type === 'EXERCISE_SKIPPED' && moved) {
      indexes.add(state.currentExerciseIndex)
    }
    state = next
  }
  return indexes
}
