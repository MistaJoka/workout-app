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
