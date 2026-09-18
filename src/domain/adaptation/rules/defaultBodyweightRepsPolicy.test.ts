import { describe, expect, it } from 'vitest'
import { defaultBodyweightRepsPolicy } from './defaultBodyweightRepsPolicy'

describe('defaultBodyweightRepsPolicy', () => {
  it('anchors the target range on the authored reps, with a modest upper band', () => {
    const policy = defaultBodyweightRepsPolicy(10)
    expect(policy.targetLow).toBe(10)
    expect(policy.targetHigh).toBe(14)
  })

  it('never lets the regression floor drop below 1 rep', () => {
    const policy = defaultBodyweightRepsPolicy(2)
    expect(policy.minReps).toBeGreaterThanOrEqual(1)
  })

  it('regresses by reps, never by load, since this policy is for bodyweight-only content', () => {
    const policy = defaultBodyweightRepsPolicy(10)
    expect(policy.downMode).toBe('reps')
  })
})
