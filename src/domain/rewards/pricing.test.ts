import { describe, expect, it } from 'vitest'
import { CARROTS_PER_WORKOUT, rewardTier, savingProgress, workoutsFor } from './pricing'

describe('workoutsFor: a price told in workouts', () => {
  it('rounds to the nearest workout, never below one', () => {
    expect(CARROTS_PER_WORKOUT).toBe(25)
    expect(workoutsFor(25)).toBe(1)
    expect(workoutsFor(60)).toBe(2)
    expect(workoutsFor(150)).toBe(6)
    expect(workoutsFor(5)).toBe(1)
    expect(workoutsFor(0)).toBe(1)
  })
})

describe('rewardTier', () => {
  it('splits small / medium / big at 40 and 100 carrots', () => {
    expect(rewardTier(25)).toBe('small')
    expect(rewardTier(39)).toBe('small')
    expect(rewardTier(40)).toBe('medium')
    expect(rewardTier(99)).toBe('medium')
    expect(rewardTier(100)).toBe('big')
    expect(rewardTier(250)).toBe('big')
  })
})

describe('savingProgress', () => {
  it('counts what she already has toward the goal, capped at the cost', () => {
    expect(savingProgress(34, 150)).toEqual({ have: 34, cost: 150, remaining: 116, pct: 23, ready: false, workoutsLeft: 5 })
    expect(savingProgress(200, 150)).toEqual({ have: 150, cost: 150, remaining: 0, pct: 100, ready: true, workoutsLeft: 0 })
  })

  it('a negative balance shows as zero progress', () => {
    expect(savingProgress(-10, 60).have).toBe(0)
  })
})
