import type { SessionEvent, SessionPlan, SessionResult } from './types'
import { effectiveSets } from './appliedEvents'

// One-line summary of the most recent completed session that actually
// performed this exercise, e.g. "Last time: 10 · 10 ✓" (all sets met),
// "Last time: 10 ✓ · 10 ✗" (mixed), "Last time: 20s · 20s" (time-based), or
// "Last time: 8 × 40 kg · 8 × 40 kg ✓" (weighted, via formatWeight).
// Pure: the caller supplies plans/results/events.
export function summarizeLastTime(
  plans: readonly SessionPlan[],
  results: readonly SessionResult[],
  events: readonly SessionEvent[],
  exerciseId: string,
  formatWeight: (kg: number) => string = (kg) => `${kg} kg`
): string | null {
  const planById = new Map(plans.map((p) => [p.id, p]))
  const ordered = [...results].sort((a, b) => b.endedAt.localeCompare(a.endedAt))

  for (const result of ordered) {
    const plan = planById.get(result.planId)
    const exercise = plan?.exercises.find((e) => e.exerciseId === exerciseId)
    if (!plan || !exercise) continue

    const sets = effectiveSets(
      plan,
      events.filter((e) => e.sessionId === result.sessionId)
    ).filter((e) => e.payload.exerciseId === exerciseId)
    if (sets.length === 0) continue

    if (exercise.reps == null) {
      const seconds = exercise.timeSeconds ?? 0
      return `Last time: ${sets.map(() => `${seconds}s`).join(' · ')}`
    }

    const describe = (s: SessionEvent): string => {
      const reps = typeof s.payload.reps === 'number' ? s.payload.reps : exercise.reps
      const kg = typeof s.payload.weightKg === 'number' ? s.payload.weightKg : exercise.weightKg
      return kg != null ? `${reps} × ${formatWeight(kg)}` : `${reps}`
    }
    const marks = sets.map((s) => s.payload.met)
    const allMet = marks.every((m) => m === true)
    if (allMet) {
      return `Last time: ${sets.map(describe).join(' · ')} ✓`
    }
    return `Last time: ${sets.map((s, i) => `${describe(s)}${marks[i] === true ? ' ✓' : marks[i] === false ? ' ✗' : ''}`).join(' · ')}`
  }

  return null
}
