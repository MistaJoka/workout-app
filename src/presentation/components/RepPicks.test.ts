import { describe, expect, it } from 'vitest'
import { quickRepPicks } from './RepPicks'

describe('quickRepPicks', () => {
  it('offers one, two and three short of the target', () => {
    expect(quickRepPicks(10)).toEqual([9, 8, 7])
  })

  it('never goes below zero', () => {
    expect(quickRepPicks(2)).toEqual([1, 0])
    expect(quickRepPicks(1)).toEqual([0])
  })
})
