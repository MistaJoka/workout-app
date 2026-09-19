// Deterministic double-progression rule, behaviorally derived from
// Gman0909/FitnessTrack (MIT) — see docs/rnd/foss-fitness/sources/fitnesstrack.md.
// ADAPT, not transplant: this is an independent implementation against this
// app's local AdaptationRule/ReasonCode interfaces, written to satisfy that
// document's target-independent test vectors (T1-T8), not copied source code.
//
// Progression (a harder variant/heavier load) is a *candidate* only —
// SOURCE_OF_TRUTH_V06.md §8 requires explicit user confirmation before a
// PROGRESSION_CANDIDATE is applied, so this function never mutates
// currentLoad/currentPrescribedReps for that case, only proposes
// candidateLoad/candidatePrescribedReps. RETAINED/ADJUSTED_WITHIN_BOUNDS/
// REGRESSED are decisions the engine is allowed to apply automatically (§7),
// so those results carry the authoritative next* values directly.
import type { ReasonCode } from '../../session/types'

export type DoubleProgressionPolicy = {
  version: string
  targetLow: number
  targetHigh: number
  repsStep: number
  minReps: number
  downConsecutiveThreshold: number
  upMode: 'percent' | 'fixed'
  upPercent?: number
  upFixed?: number
  downMode: 'reps' | 'percent' | 'fixed'
  downPercent?: number
  downFixed?: number
  maxWeightCap?: number
}

export type SetPerformance = {
  prescribedReps: number
  performedReps: number | null
}

export type DoubleProgressionInput = {
  exerciseId: string
  currentLoad: number
  startingLoad: number
  consecutiveFailureStreak: number
  currentPrescribedReps: number
  sets: SetPerformance[]
  policy: DoubleProgressionPolicy
}

export type DoubleProgressionResult = {
  exerciseId: string
  reasonCode: ReasonCode
  detail: string
  nextPrescribedReps: number
  nextLoad: number
  nextFailureStreak: number
  candidateLoad?: number
  candidatePrescribedReps?: number
}

function computeUpLoad(currentLoad: number, policy: DoubleProgressionPolicy): number {
  const raw =
    policy.upMode === 'percent'
      ? currentLoad * (1 + (policy.upPercent ?? 0) / 100)
      : currentLoad + (policy.upFixed ?? 0)
  const capped = policy.maxWeightCap != null ? Math.min(raw, policy.maxWeightCap) : raw
  return roundToHalf(capped)
}

function computeDownLoad(currentLoad: number, startingLoad: number, policy: DoubleProgressionPolicy): number {
  const raw =
    policy.downMode === 'percent'
      ? currentLoad * (1 - (policy.downPercent ?? 0) / 100)
      : currentLoad - (policy.downFixed ?? 0)
  return Math.max(roundToHalf(raw), startingLoad)
}

// Loads are kilograms; 0.5 kg is the finest real-world plate increment.
function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2
}

export function evaluateDoubleProgression(input: DoubleProgressionInput): DoubleProgressionResult {
  const { exerciseId, currentLoad, startingLoad, consecutiveFailureStreak, currentPrescribedReps, sets, policy } =
    input

  const hasMissingData = sets.some((s) => s.performedReps == null)
  if (hasMissingData) {
    return {
      exerciseId,
      reasonCode: 'RETAINED',
      detail: 'Missing/incomplete performed-reps data for a working set — no confident progression recommendation.',
      nextPrescribedReps: currentPrescribedReps,
      nextLoad: currentLoad,
      nextFailureStreak: consecutiveFailureStreak,
    }
  }

  const allSetsMet = sets.every((s) => (s.performedReps as number) >= s.prescribedReps)

  if (allSetsMet) {
    const atUpperTarget = currentPrescribedReps >= policy.targetHigh

    if (atUpperTarget) {
      const isBodyweight = currentLoad === 0
      // Bodyweight has no load to add, but unlike the loaded case it also
      // has no "harder variant" to fall back on in this app yet (exercise
      // substitution is out of scope) — so its candidate is simply a step
      // further into a higher rep bracket, not a no-op. Still gated behind
      // confirmation (§8): stepping into a materially harder rep bracket is
      // exactly the kind of thing a user should acknowledge, not have
      // silently auto-applied like the below-ceiling ADJUSTED_WITHIN_BOUNDS case.
      return {
        exerciseId,
        reasonCode: 'PROGRESSION_CANDIDATE',
        detail: isBodyweight
          ? "Clean at the top of your rep range — ready to push into a higher rep bracket?"
          : 'Clean completion at the upper rep target — candidate for a load increase.',
        nextPrescribedReps: currentPrescribedReps,
        nextLoad: currentLoad,
        nextFailureStreak: 0,
        candidateLoad: isBodyweight ? currentLoad : computeUpLoad(currentLoad, policy),
        candidatePrescribedReps: isBodyweight ? currentPrescribedReps + policy.repsStep : policy.targetLow,
      }
    }

    return {
      exerciseId,
      reasonCode: 'ADJUSTED_WITHIN_BOUNDS',
      detail: 'Clean completion below the upper rep target — prescribed reps progress within range.',
      nextPrescribedReps: Math.min(currentPrescribedReps + policy.repsStep, policy.targetHigh),
      nextLoad: currentLoad,
      nextFailureStreak: 0,
    }
  }

  const nextFailureStreak = consecutiveFailureStreak + 1
  if (nextFailureStreak < policy.downConsecutiveThreshold) {
    return {
      exerciseId,
      reasonCode: 'RETAINED',
      detail: `Under target, but below the ${policy.downConsecutiveThreshold}-session regression threshold — retaining current prescription.`,
      nextPrescribedReps: currentPrescribedReps,
      nextLoad: currentLoad,
      nextFailureStreak,
    }
  }

  if (policy.downMode === 'reps') {
    return {
      exerciseId,
      reasonCode: 'REGRESSED',
      detail: 'Consecutive-failure threshold reached — regressing prescribed reps, retaining load.',
      nextPrescribedReps: Math.max(currentPrescribedReps - policy.repsStep, policy.minReps),
      nextLoad: currentLoad,
      nextFailureStreak: 0,
    }
  }

  return {
    exerciseId,
    reasonCode: 'REGRESSED',
    detail: 'Consecutive-failure threshold reached — regressing load, floored at the starting load.',
    nextPrescribedReps: currentPrescribedReps,
    nextLoad: computeDownLoad(currentLoad, startingLoad, policy),
    nextFailureStreak: 0,
  }
}
