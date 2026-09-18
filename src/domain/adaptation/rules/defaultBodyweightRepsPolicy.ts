import type { DoubleProgressionPolicy } from './doubleProgression'

// A single, generic, clearly-labeled v1 default for rep-based bodyweight
// exercises — NOT per-exercise coaching judgment. Same status as this app's
// other draft-content defaults (see foundationStrengthStarter.ts): a
// conservative starting point pending real per-exercise tuning (REQ-20260913-002).
// Load progression is unused (upFixed: 0) since this app has no weighted
// prescriptions yet.
export function defaultBodyweightRepsPolicy(authoredReps: number): DoubleProgressionPolicy {
  return {
    version: 'v1-bodyweight-default',
    targetLow: authoredReps,
    targetHigh: authoredReps + 4,
    repsStep: 2,
    minReps: Math.max(authoredReps - 4, 1),
    downConsecutiveThreshold: 2,
    upMode: 'fixed',
    upFixed: 0,
    downMode: 'reps',
  }
}
