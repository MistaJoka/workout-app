import type { PersonalRecord, SetRecord } from './types'
import { detectPersonalRecords } from './stats'

// Live "personal best" moments in the player: before a set, whether
// finishing it would beat the user's own prior best for this move; after a
// counted set, whether it actually did. Built on the same projections
// Progress/exerciseYou.ts use (detectPersonalRecords), scoped to one
// exercise and only ever fed records from finished sessions
// (projectSetRecords iterates SessionResults, so an in-progress session
// never appears) — `currentSessionId` is a defensive belt for a caller that
// hasn't filtered yet.
export function priorBestForExercise(
  records: readonly SetRecord[],
  exerciseId: string,
  currentSessionId: string
): PersonalRecord | null {
  const prior = records.filter((r) => r.exerciseId === exerciseId && r.sessionId !== currentSessionId)
  return detectPersonalRecords(prior).get(exerciseId) ?? null
}

// What the player is about to attempt, or what it just logged: reps, a
// timed hold's seconds, or a weighted set's reps at a given load. Mirrors
// PersonalRecord's own unit split so a preview or a completed set compares
// like with like.
export type LiveBestTarget =
  | { unit: 'reps'; value: number }
  | { unit: 'seconds'; value: number }
  | { unit: 'kg'; value: number; reps: number } // value = weight, kg

export type LiveBestPreview = {
  // The prior best, in the target's own terms (reps, seconds, or reps at
  // the matching weight) — null when there's nothing to compare, or
  // (weighted) the prior best was at a different load. CLAUDE.md: never
  // invent an equivalence between different weights.
  priorBest: number | null
  beatsBestIfDone: boolean
  // How many more reps/seconds than the current target would beat the
  // prior best; 0 once the target itself already would. Null alongside
  // priorBest. The caller decides what counts as "close" (e.g. <= 2).
  gap: number | null
}

// Only strictly improved values beat a record — matching
// detectPersonalRecords (stats.ts): a tie never counts, and a weighted
// comparison only applies at the same load.
function beatsRecord(prior: PersonalRecord, target: LiveBestTarget): boolean | null {
  if (prior.unit !== target.unit) return null
  if (target.unit === 'kg') {
    if (target.value !== prior.value) return null
    return target.reps > (prior.reps ?? 0)
  }
  return target.value > prior.value
}

export function liveBestPreview(prior: PersonalRecord | null, target: LiveBestTarget): LiveBestPreview {
  if (!prior) return { priorBest: null, beatsBestIfDone: false, gap: null }
  const beats = beatsRecord(prior, target)
  if (beats === null) return { priorBest: null, beatsBestIfDone: false, gap: null }
  const priorValue = target.unit === 'kg' ? (prior.reps ?? 0) : prior.value
  const targetValue = target.unit === 'kg' ? target.reps : target.value
  return { priorBest: priorValue, beatsBestIfDone: beats, gap: beats ? 0 : priorValue - targetValue + 1 }
}

// What actually happened on a counted set: performed reps come from the
// event payload when the player logged them (a rep check's "fell short"),
// the prescribed amount otherwise (a hold, or a met rep/weighted set with
// no explicit count). A logged weight overrides the plan's.
export function performedTarget(target: LiveBestTarget, payload: { reps?: number; weightKg?: number }): LiveBestTarget {
  if (target.unit === 'seconds') return target
  if (target.unit === 'kg') {
    const weight = typeof payload.weightKg === 'number' ? payload.weightKg : target.value
    const reps = typeof payload.reps === 'number' ? payload.reps : target.reps
    return { unit: 'kg', value: weight, reps }
  }
  const reps = typeof payload.reps === 'number' ? payload.reps : target.value
  return { unit: 'reps', value: reps }
}

// Did the set that just landed beat the prior best?
export function didSetBeatPriorBest(prior: PersonalRecord | null, performed: LiveBestTarget): boolean {
  if (!prior) return false
  return beatsRecord(prior, performed) === true
}
