import { describe, expect, it } from 'vitest'
import { evaluateDoubleProgression, type DoubleProgressionPolicy } from './doubleProgression'

// Behavioral spec extracted from docs/rnd/foss-fitness/sources/fitnesstrack.md
// (Gman0909/FitnessTrack, MIT). Test vectors T1-T8 are that document's
// target-independent test vectors, not copied upstream tests — see
// "Implementation policy: ADAPT, do not transplant."

const basePolicy: DoubleProgressionPolicy = {
  version: 'v1-fitnesstrack-derived',
  targetLow: 6,
  targetHigh: 12,
  repsStep: 2,
  minReps: 4,
  downConsecutiveThreshold: 2,
  upMode: 'percent',
  upPercent: 5,
  downMode: 'fixed',
  downFixed: 5,
}

describe('evaluateDoubleProgression', () => {
  // T1 — no progression before upper target
  it('progresses reps within range on clean completion below the upper target', () => {
    const result = evaluateDoubleProgression({
      exerciseId: 'ex1',
      currentLoad: 100,
      startingLoad: 80,
      consecutiveFailureStreak: 0,
      currentPrescribedReps: 8,
      sets: [
        { prescribedReps: 8, performedReps: 8 },
        { prescribedReps: 8, performedReps: 8 },
        { prescribedReps: 8, performedReps: 8 },
      ],
      policy: basePolicy,
    })

    expect(result.reasonCode).toBe('ADJUSTED_WITHIN_BOUNDS')
    expect(result.nextPrescribedReps).toBe(10)
    expect(result.nextLoad).toBe(100)
    expect(result.nextFailureStreak).toBe(0)
  })

  // T2 — clean top-range completion
  it('marks a load progression candidate and proposes a reset-to-floor rep target at the upper bound', () => {
    const result = evaluateDoubleProgression({
      exerciseId: 'ex1',
      currentLoad: 100,
      startingLoad: 80,
      consecutiveFailureStreak: 0,
      currentPrescribedReps: 12,
      sets: [
        { prescribedReps: 12, performedReps: 12 },
        { prescribedReps: 12, performedReps: 12 },
        { prescribedReps: 12, performedReps: 12 },
      ],
      policy: basePolicy,
    })

    expect(result.reasonCode).toBe('PROGRESSION_CANDIDATE')
    // current (unconfirmed) prescription is untouched
    expect(result.nextPrescribedReps).toBe(12)
    expect(result.nextLoad).toBe(100)
    expect(result.candidatePrescribedReps).toBe(6)
    expect(result.candidateLoad).toBe(105)
  })

  // T3 — one miss below lower bound
  it('retains the prescription on a single miss below threshold', () => {
    const result = evaluateDoubleProgression({
      exerciseId: 'ex1',
      currentLoad: 100,
      startingLoad: 80,
      consecutiveFailureStreak: 0,
      currentPrescribedReps: 6,
      sets: [{ prescribedReps: 6, performedReps: 5 }],
      policy: basePolicy,
    })

    expect(result.reasonCode).toBe('RETAINED')
    expect(result.nextPrescribedReps).toBe(6)
    expect(result.nextLoad).toBe(100)
    expect(result.nextFailureStreak).toBe(1)
  })

  // T4 — repeated miss reaches threshold
  it('regresses once the consecutive-failure threshold is reached', () => {
    const result = evaluateDoubleProgression({
      exerciseId: 'ex1',
      currentLoad: 100,
      startingLoad: 80,
      consecutiveFailureStreak: 1,
      currentPrescribedReps: 6,
      sets: [{ prescribedReps: 6, performedReps: 5 }],
      policy: { ...basePolicy, downMode: 'reps' },
    })

    expect(result.reasonCode).toBe('REGRESSED')
    expect(result.nextPrescribedReps).toBe(4) // clamped at policy.minReps
    expect(result.nextLoad).toBe(100)
    expect(result.nextFailureStreak).toBe(0)
  })

  // T5 — bodyweight success
  //
  // Revised from the spec's literal "harder variant" framing: this app has
  // no exercise-substitution feature (deliberately out of V1 scope), so a
  // bodyweight candidate that just repeats the same currentPrescribedReps
  // would make "Try Next Level?" a confirm button that does nothing —
  // exactly the broken-feeling experience this whole feature exists to
  // avoid. Instead, the bodyweight candidate is a real step further into a
  // higher rep bracket, so confirming it visibly does something.
  it('marks a bodyweight progression candidate that steps reps higher, without proposing a load increase', () => {
    const result = evaluateDoubleProgression({
      exerciseId: 'ex1',
      currentLoad: 0,
      startingLoad: 0,
      consecutiveFailureStreak: 0,
      currentPrescribedReps: 12,
      sets: [
        { prescribedReps: 12, performedReps: 12 },
        { prescribedReps: 12, performedReps: 12 },
      ],
      policy: basePolicy,
    })

    expect(result.reasonCode).toBe('PROGRESSION_CANDIDATE')
    expect(result.candidateLoad).toBe(0)
    expect(result.candidatePrescribedReps).toBe(14) // 12 + policy.repsStep(2)
    expect(result.nextPrescribedReps).toBe(12) // unconfirmed — current value untouched
    expect(result.detail).toMatch(/rep bracket/i)
  })

  // T6 — floor protection
  it('never regresses load below the starting floor', () => {
    const result = evaluateDoubleProgression({
      exerciseId: 'ex1',
      currentLoad: 82,
      startingLoad: 80,
      consecutiveFailureStreak: 1,
      currentPrescribedReps: 6,
      sets: [{ prescribedReps: 6, performedReps: 5 }],
      policy: { ...basePolicy, downMode: 'fixed', downFixed: 5 },
    })

    expect(result.reasonCode).toBe('REGRESSED')
    expect(result.nextLoad).toBe(80)
  })

  // T7 — maximum cap
  it('never proposes a load candidate above the configured cap', () => {
    const result = evaluateDoubleProgression({
      exerciseId: 'ex1',
      currentLoad: 198,
      startingLoad: 80,
      consecutiveFailureStreak: 0,
      currentPrescribedReps: 12,
      sets: [
        { prescribedReps: 12, performedReps: 12 },
        { prescribedReps: 12, performedReps: 12 },
      ],
      policy: { ...basePolicy, upMode: 'fixed', upFixed: 10, maxWeightCap: 200 },
    })

    expect(result.reasonCode).toBe('PROGRESSION_CANDIDATE')
    expect(result.candidateLoad).toBe(200)
  })

  // T8 — malformed/incomplete history
  it('does not produce a confident progression when a set is missing performed reps', () => {
    const result = evaluateDoubleProgression({
      exerciseId: 'ex1',
      currentLoad: 100,
      startingLoad: 80,
      consecutiveFailureStreak: 0,
      currentPrescribedReps: 8,
      sets: [
        { prescribedReps: 8, performedReps: 8 },
        { prescribedReps: 8, performedReps: null },
      ],
      policy: basePolicy,
    })

    expect(result.reasonCode).toBe('RETAINED')
    expect(result.nextPrescribedReps).toBe(8)
    expect(result.nextFailureStreak).toBe(0)
    expect(result.detail).toMatch(/missing|incomplete/i)
  })
})
