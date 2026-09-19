import { describe, expect, it } from 'vitest'
import { defaultWeightedPolicy, WEIGHT_STEP_KG } from './defaultWeightedPolicy'
import { evaluateDoubleProgression } from './doubleProgression'

describe('defaultWeightedPolicy', () => {
  it('proposes a +2.5 kg load candidate with reps reset to the authored target once the rep band is topped', () => {
    const policy = defaultWeightedPolicy(8)
    const result = evaluateDoubleProgression({
      exerciseId: 'w',
      currentLoad: 40,
      startingLoad: 40,
      consecutiveFailureStreak: 0,
      currentPrescribedReps: 10,
      sets: [
        { prescribedReps: 10, performedReps: 10 },
        { prescribedReps: 10, performedReps: 10 },
      ],
      policy,
    })
    expect(result.reasonCode).toBe('PROGRESSION_CANDIDATE')
    expect(result.candidateLoad).toBe(40 + WEIGHT_STEP_KG)
    expect(result.candidatePrescribedReps).toBe(8)
  })

  it('regresses load by 2.5 kg after two misses but never below the authored load', () => {
    const policy = defaultWeightedPolicy(8)
    const result = evaluateDoubleProgression({
      exerciseId: 'w',
      currentLoad: 42.5,
      startingLoad: 40,
      consecutiveFailureStreak: 1,
      currentPrescribedReps: 8,
      sets: [{ prescribedReps: 8, performedReps: 6 }],
      policy,
    })
    expect(result.reasonCode).toBe('REGRESSED')
    expect(result.nextLoad).toBe(40)
  })
})
