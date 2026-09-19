import type { SessionEvent, SessionPlan, SessionResult } from './types'

// One-line summary of the most recent completed session that actually
// performed this exercise, e.g. "Last time: 10 · 10 ✓" (all sets met),
// "Last time: 10 ✓ · 10 ✗" (mixed), or "Last time: 20s · 20s" (time-based).
// Pure: the caller supplies plans/results/events.
export function summarizeLastTime(
  plans: readonly SessionPlan[],
  results: readonly SessionResult[],
  events: readonly SessionEvent[],
  exerciseId: string
): string | null {
  const planById = new Map(plans.map((p) => [p.id, p]))
  const ordered = [...results].sort((a, b) => b.endedAt.localeCompare(a.endedAt))

  for (const result of ordered) {
    const plan = planById.get(result.planId)
    const exercise = plan?.exercises.find((e) => e.exerciseId === exerciseId)
    if (!plan || !exercise) continue

    const sets = events
      .filter((e) => e.sessionId === result.sessionId && e.type === 'SET_COMPLETED' && e.payload.exerciseId === exerciseId)
      .sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
    if (sets.length === 0) continue

    if (exercise.reps == null) {
      const seconds = exercise.timeSeconds ?? 0
      return `Last time: ${sets.map(() => `${seconds}s`).join(' · ')}`
    }

    const marks = sets.map((s) => s.payload.met)
    const allMet = marks.every((m) => m === true)
    if (allMet) {
      return `Last time: ${sets.map(() => `${exercise.reps}`).join(' · ')} ✓`
    }
    return `Last time: ${marks.map((m) => `${exercise.reps}${m === true ? ' ✓' : m === false ? ' ✗' : ''}`).join(' · ')}`
  }

  return null
}
