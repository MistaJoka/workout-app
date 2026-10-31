import { describe, expect, it } from 'vitest'
import { countLabel } from './format'

describe('countLabel', () => {
  it('says one set, never 1 sets', () => {
    expect(countLabel(1, 'set')).toBe('1 set')
    expect(countLabel(0, 'set')).toBe('0 sets')
    expect(countLabel(2, 'workout')).toBe('2 workouts')
  })

  it('takes an irregular plural', () => {
    expect(countLabel(3, 'day in bloom', 'days in bloom')).toBe('3 days in bloom')
  })
})
