import { effectiveSets } from '../../domain/session/appliedEvents'
import type { SessionEvent, SessionPlan, SessionResult } from '../../domain/session/types'

export type CompleteStats = { minutes: number; sets: number; moves: number }

// The three numbers on the finish screen. Moves counts only exercises that
// got at least one applied set, so an early end doesn't claim moves it
// never reached; a stray tap never adds one.
export function completeStats(plan: SessionPlan, result: SessionResult, events: readonly SessionEvent[]): CompleteStats {
  const elapsedMs = Date.parse(result.endedAt) - Date.parse(result.startedAt)
  const worked = new Set(effectiveSets(plan, events).map((e) => e.payload.exerciseId))
  return {
    minutes: Math.max(1, Math.round(elapsedMs / 60_000)),
    sets: result.totalSetsCompleted,
    moves: plan.exercises.filter((e) => worked.has(e.exerciseId)).length,
  }
}
