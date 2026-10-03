import { describe, expect, it } from 'vitest'
import { nextGoal } from './nextGoal'

describe('nextGoal', () => {
  it('picks the workout milestone when it is the closer goal by remaining share', () => {
    // 3 of 5 done (2 remaining, 40% of the way to go) vs a level that just
    // started (100 of 100 XP remaining, 100% of the way to go).
    expect(nextGoal(3, 0)).toEqual({ kind: 'milestone', label: '2 more workouts to your 5th' })
  })

  it('picks the level when it is the closer goal by remaining share', () => {
    // 4 of 5 workouts (1 remaining, 20%) vs 95 of 100 XP into the level (5
    // remaining, 5%): the level is proportionally closer.
    expect(nextGoal(4, 95)).toEqual({ kind: 'level', label: '5 XP to your next level' })
  })

  it('falls back to the level when no workout has finished yet (no milestone)', () => {
    expect(nextGoal(0, 50)).toEqual({ kind: 'level', label: '50 XP to your next level' })
  })

  it('uses "workout" singular for exactly one remaining', () => {
    expect(nextGoal(9, 0)?.label).toContain('1 more workout to your 10th')
  })

  it('is never null in practice: a level always has XP left to go', () => {
    expect(nextGoal(0, 0)).not.toBeNull()
  })
})

describe('nextGoal with badges', () => {
  const badge = (title: string, current: number, target: number, unit: string) => ({ title, progress: { current, target, unit } })

  it('a nearly-earned badge wins when it is the closest goal', () => {
    // 90 of 100 sets (10% to go) beats 2 of 5 workouts and a fresh level.
    expect(nextGoal(3, 0, [badge('Hundred sets', 90, 100, 'sets')])).toEqual({
      kind: 'badge',
      label: '10 more sets to Hundred sets',
    })
  })

  it('singular units for exactly one left', () => {
    expect(nextGoal(3, 0, [badge('Month of goals', 3, 4, 'weeks')])?.label).toBe('1 more week to Month of goals')
    expect(nextGoal(3, 0, [badge('Ten-minute hold', 9, 10, 'min')])?.label).toBe('1 more min to Ten-minute hold')
  })

  it('ignores badges with nothing to show', () => {
    expect(nextGoal(3, 0, [{ title: 'Night owl', progress: null }])?.kind).toBe('milestone')
  })
})

