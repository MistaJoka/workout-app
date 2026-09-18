import type { SessionEvent, SessionPlan } from '../session/types'
import { evaluateDoubleProgression, type DoubleProgressionResult } from './rules/doubleProgression'
import { defaultBodyweightRepsPolicy } from './rules/defaultBodyweightRepsPolicy'

export type ExerciseProgressionState = {
  currentPrescribedReps: number | null
  consecutiveFailureStreak: number
}

// Pure by design (no DB access) — the caller (sessionService) fetches
// per-exercise progression state and persists the results.
export function evaluateSessionProgression(
  plan: SessionPlan,
  events: SessionEvent[],
  progressionByExerciseId: Map<string, ExerciseProgressionState>
): DoubleProgressionResult[] {
  const results: DoubleProgressionResult[] = []

  for (const exercise of plan.exercises) {
    // Hold/time-based exercises (e.g. Plank) aren't covered by this reps-only
    // v1 policy — see defaultBodyweightRepsPolicy.
    if (exercise.reps == null) continue

    const setEvents = events.filter(
      (e) => e.type === 'SET_COMPLETED' && e.payload.exerciseId === exercise.exerciseId
    )
    if (setEvents.length === 0) continue

    const state = progressionByExerciseId.get(exercise.exerciseId) ?? {
      currentPrescribedReps: null,
      consecutiveFailureStreak: 0,
    }
    const currentPrescribedReps = state.currentPrescribedReps ?? exercise.reps

    const sets = setEvents.map((e) => ({
      prescribedReps: currentPrescribedReps,
      performedReps: e.payload.met ? currentPrescribedReps : Math.max(currentPrescribedReps - 1, 0),
    }))

    results.push(
      evaluateDoubleProgression({
        exerciseId: exercise.exerciseId,
        currentLoad: 0,
        startingLoad: 0,
        consecutiveFailureStreak: state.consecutiveFailureStreak,
        currentPrescribedReps,
        sets,
        // Anchored to the template's authored reps, not the (possibly
        // already-progressed) current value — the target range must stay
        // fixed across the whole progression arc, or targetHigh would
        // recede every session and PROGRESSION_CANDIDATE could never fire.
        policy: defaultBodyweightRepsPolicy(exercise.reps),
      })
    )
  }

  return results
}
