import type { DoubleProgressionPolicy } from './doubleProgression'

// Generic v1 default for weighted (barbell/dumbbell/machine...) exercises:
// classic double progression. Reps climb one at a time inside a small band
// above the authored target; at the top, a +2.5 kg load candidate is
// proposed and reps reset to the authored value once confirmed. Two
// consecutive misses drop the load by 2.5 kg, never below the authored
// (starting) load. Not per-exercise coaching judgment; same draft status
// as defaultBodyweightRepsPolicy.
export const WEIGHT_STEP_KG = 2.5

export function defaultWeightedPolicy(authoredReps: number): DoubleProgressionPolicy {
  return {
    version: 'v1-weighted-default',
    targetLow: authoredReps,
    targetHigh: authoredReps + 2,
    repsStep: 1,
    minReps: Math.max(authoredReps - 2, 1),
    downConsecutiveThreshold: 2,
    upMode: 'fixed',
    upFixed: WEIGHT_STEP_KG,
    downMode: 'fixed',
    downFixed: WEIGHT_STEP_KG,
  }
}
