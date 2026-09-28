import { describe, expect, it } from 'vitest'
import { FAMILIAR_AFTER_SESSIONS, familiarExerciseIds, isFamiliar } from './familiarity'

describe('isFamiliar', () => {
  it('is familiar once a move was done in FAMILIAR_AFTER_SESSIONS sessions', () => {
    expect(FAMILIAR_AFTER_SESSIONS).toBe(3)
    expect(isFamiliar(0)).toBe(false)
    expect(isFamiliar(2)).toBe(false)
    expect(isFamiliar(3)).toBe(true)
    expect(isFamiliar(10)).toBe(true)
  })
})

describe('familiarExerciseIds', () => {
  it('keeps only the ids whose records say familiar; missing records are new moves', () => {
    const ids = familiarExerciseIds([
      { exerciseId: 'a', exposureCount: 3 },
      { exerciseId: 'b', exposureCount: 1 },
      undefined,
    ])
    expect([...ids]).toEqual(['a'])
  })
})
