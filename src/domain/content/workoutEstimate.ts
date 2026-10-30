import { CIRCUIT_MOVE_REST_SECONDS, CIRCUIT_ROUND_REST_SECONDS } from '../session/circuit'
import type { WorkoutTemplate } from './types'

// About how long a template takes: ~3s per rep, plus ~15s per set to get
// into position, plus its rest; rounded up to 5 minutes, at least 5.
export function estimateMinutes(template: WorkoutTemplate | undefined): number {
  if (!template) return 0
  // A circuit: one set of each move per round, a short rest between moves
  // and a longer one after each round (domain/session/circuit.ts).
  if (template.circuit) {
    const perRound = template.exercises.reduce(
      (sum, e) => sum + (e.prescription.timeSeconds ?? (e.prescription.reps ?? 0) * 3) + CIRCUIT_MOVE_REST_SECONDS + 15,
      0,
    )
    const seconds = template.circuit.rounds * (perRound + CIRCUIT_ROUND_REST_SECONDS - CIRCUIT_MOVE_REST_SECONDS)
    return Math.max(5, Math.ceil(seconds / 60 / 5) * 5)
  }
  const seconds = template.exercises.reduce((sum, e) => {
    const work = e.prescription.timeSeconds ?? (e.prescription.reps ?? 0) * 3
    return sum + e.prescription.sets * (work + e.prescription.restSeconds + 15)
  }, 0)
  return Math.max(5, Math.ceil(seconds / 60 / 5) * 5)
}

export const WARM_UP_ID = 'draft.warm-up'
export const COOL_DOWN_ID = 'draft.cool-down'

// The optional warm-up before and cool-down after a main workout. Neither
// is offered around the warm-up or cool-down themselves, nor when that
// workout doesn't exist.
export function bookendsFor(
  templateId: string,
  lookup: (id: string) => WorkoutTemplate | undefined
): { warmUp?: WorkoutTemplate; coolDown?: WorkoutTemplate } {
  if (templateId === WARM_UP_ID || templateId === COOL_DOWN_ID) return {}
  const warmUp = lookup(WARM_UP_ID)
  const coolDown = lookup(COOL_DOWN_ID)
  return { ...(warmUp ? { warmUp } : {}), ...(coolDown ? { coolDown } : {}) }
}
