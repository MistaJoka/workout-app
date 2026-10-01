import { describe, expect, it } from 'vitest'
import { weekSummary } from './WeekBlooms'

describe('weekSummary', () => {
  it('names the goal before the first workout of the week', () => {
    expect(weekSummary(0, 2)).toBe('Goal: 2 this week')
  })

  it('reads progress toward the goal, never a bare count', () => {
    expect(weekSummary(1, 2)).toBe('1 of 2 this week')
    expect(weekSummary(2, 3)).toBe('2 of 3 this week')
  })

  it('says the goal is met, and keeps counting past it', () => {
    expect(weekSummary(2, 2)).toBe('Goal met, 2 of 2')
    expect(weekSummary(3, 2)).toBe('Goal met, 3 of 2')
  })
})
