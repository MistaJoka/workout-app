import { describe, expect, it } from 'vitest'
import { setChimeFrequency } from './restFeedback'

describe('setChimeFrequency', () => {
  it('starts at C5 and rises with every set', () => {
    const total = 10
    const notes = Array.from({ length: total }, (_, i) => setChimeFrequency(i + 1, total))
    expect(notes[0]).toBeCloseTo(523.25, 1)
    for (let i = 1; i < notes.length; i++) expect(notes[i]).toBeGreaterThan(notes[i - 1])
  })

  it('stays inside two octaves however long the workout is', () => {
    for (const total of [2, 6, 30]) {
      expect(setChimeFrequency(total, total)).toBeLessThanOrEqual(523.25 * 4)
      expect(setChimeFrequency(1, total)).toBeCloseTo(523.25, 1)
    }
  })

  it('handles a one-set workout and out-of-range input', () => {
    expect(setChimeFrequency(1, 1)).toBeCloseTo(523.25, 1)
    expect(setChimeFrequency(0, 0)).toBeCloseTo(523.25, 1)
  })
})
