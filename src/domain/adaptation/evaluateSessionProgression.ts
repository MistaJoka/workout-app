import type { SessionEvent, SessionPlan } from '../session/types'
import { evaluateDoubleProgression, type DoubleProgressionResult } from './rules/doubleProgression'
import { defaultBodyweightRepsPolicy } from './rules/defaultBodyweightRepsPolicy'
import { defaultWeightedPolicy } from './rules/defaultWeightedPolicy'

export type ExerciseProgressionState = {
  currentPrescribedReps: number | null
  currentWeightKg?: number | null
  consecutiveFailureStreak: number
}

export type SessionProgressionOutcome = DoubleProgressionResult & {
  weighted: boolean
  // Set when the exercise produced no evidence (not every planned set was
  // logged). The persisted state must not change — including a pending
  // candidate the user has not yet answered, which a plain RETAINED would
  // otherwise clear (progression requires explicit confirmation or dismissal).
  preservePending?: true
}

// Pure by design (no DB access) — the caller (sessionService) fetches
// per-exercise progression state and persists the results.
export function evaluateSessionProgression(
  plan: SessionPlan,
  events: SessionEvent[],
  progressionByExerciseId: Map<string, ExerciseProgressionState>
): SessionProgressionOutcome[] {
  const results: SessionProgressionOutcome[] = []

  for (const exercise of plan.exercises) {
    // Hold/time-based exercises (e.g. Plank) aren't covered by these
    // reps-based policies.
    if (exercise.reps == null) continue

    const setEvents = events.filter(
      (e) => e.type === 'SET_COMPLETED' && e.payload.exerciseId === exercise.exerciseId
    )
    if (setEvents.length === 0) continue

    const state = progressionByExerciseId.get(exercise.exerciseId) ?? {
      currentPrescribedReps: null,
      currentWeightKg: null,
      consecutiveFailureStreak: 0,
    }
    const currentPrescribedReps = state.currentPrescribedReps ?? exercise.reps
    const weighted = exercise.weightKg != null

    // A session ended early (or a set skipped) is not evidence either way:
    // every planned working set must be logged before anything changes.
    // Caught by ChatGPT's Promotion 001 corpus (cases P001-05/06).
    if (setEvents.length < exercise.sets) {
      results.push({
        exerciseId: exercise.exerciseId,
        reasonCode: 'RETAINED',
        detail: 'Not every planned set was done, so nothing changes.',
        nextPrescribedReps: currentPrescribedReps,
        nextLoad: weighted ? state.currentWeightKg ?? exercise.weightKg ?? 0 : 0,
        nextFailureStreak: state.consecutiveFailureStreak,
        weighted,
        preservePending: true,
      })
      continue
    }

    // For weighted work the load actually lifted this session wins over
    // the prescription: the player lets the user adjust it per set, and the
    // last logged value is what the next session should build on.
    const loggedLoads = setEvents
      .map((e) => e.payload.weightKg)
      .filter((w): w is number => typeof w === 'number')
    const currentLoad = weighted
      ? loggedLoads.length > 0
        ? loggedLoads[loggedLoads.length - 1]
        : state.currentWeightKg ?? exercise.weightKg ?? 0
      : 0
    const startingLoad = weighted ? exercise.authoredWeightKg ?? exercise.weightKg ?? 0 : 0

    const sets = setEvents.map((e) => ({
      prescribedReps: currentPrescribedReps,
      performedReps:
        typeof e.payload.reps === 'number'
          ? e.payload.reps
          : e.payload.met
            ? currentPrescribedReps
            : Math.max(currentPrescribedReps - 1, 0),
    }))

    const authored = exercise.authoredReps ?? exercise.reps
    results.push({
      ...evaluateDoubleProgression({
        exerciseId: exercise.exerciseId,
        currentLoad,
        startingLoad,
        consecutiveFailureStreak: state.consecutiveFailureStreak,
        currentPrescribedReps,
        sets,
        // Anchored to authoredReps (the template's fixed default), never to
        // exercise.reps — that field carries this session's *effective*
        // prescription, which already has any confirmed override baked in.
        // Anchoring to it would let the target range recede every time reps
        // increase, and PROGRESSION_CANDIDATE could never fire.
        policy: weighted ? defaultWeightedPolicy(authored) : defaultBodyweightRepsPolicy(authored),
      }),
      weighted,
    })
  }

  return results
}
