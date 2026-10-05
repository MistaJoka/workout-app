import { describe, expect, it } from 'vitest'
import { CARROTS_PER_WORKOUT, rewardTier, savingProgress, weeklyForecast, weeksFor, workoutsFor, workoutsToGoAfter } from './pricing'

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

describe('mega prizes', () => {
  it('500 carrots and up is the mega tier', () => {
    expect(rewardTier(499)).toBe('big')
    expect(rewardTier(500)).toBe('mega')
    expect(rewardTier(1000)).toBe('mega')
  })

  it('tells a price in weeks at her own weekly pace', () => {
    expect(weeksFor(1000, 3)).toBe(14)
    expect(weeksFor(1000, 0)).toBe(40)
  })
})

describe('weeklyForecast: what a planned week is worth toward a goal', () => {
  it('counts each planned workout plus the weekly-goal bonus', () => {
    expect(weeklyForecast(3, 1000)).toEqual({ perWeek: 95, weeks: 11, ready: false })
  })
  it('with nothing planned, uses the default goal of 2', () => {
    expect(weeklyForecast(0, 100)).toEqual({ perWeek: 70, weeks: 2, ready: false })
  })
  it('a goal already reached is ready, never "~0 weeks"', () => {
    expect(weeklyForecast(3, 0)).toEqual({ perWeek: 95, weeks: 0, ready: true })
  })
})

describe('workoutsToGoAfter: where a goal stands after spending on something else', () => {
  it('counts the workouts still needed after the spend', () => {
    expect(workoutsToGoAfter({ cost: 1000 }, 400, 60)).toBe(27)
  })
  it('is 0 while the goal stays within reach', () => {
    expect(workoutsToGoAfter({ cost: 100 }, 300, 60)).toBe(0)
  })
  it('is null when nothing is spent', () => {
    expect(workoutsToGoAfter({ cost: 1000 }, 400, 0)).toBeNull()
  })
})
