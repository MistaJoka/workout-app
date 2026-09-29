import { describe, expect, it } from 'vitest'
import { nextFocusIndex } from './useSheetFocus'

describe('nextFocusIndex', () => {
  it('moves forward and wraps from the last control to the first', () => {
    expect(nextFocusIndex(0, 3, false)).toBe(1)
    expect(nextFocusIndex(2, 3, false)).toBe(0)
  })

  it('moves backward and wraps from the first control to the last', () => {
    expect(nextFocusIndex(1, 3, true)).toBe(0)
    expect(nextFocusIndex(0, 3, true)).toBe(2)
  })

  it('enters the sheet at an end when focus is outside it, and gives up when empty', () => {
    expect(nextFocusIndex(-1, 3, false)).toBe(0)
    expect(nextFocusIndex(-1, 3, true)).toBe(2)
    expect(nextFocusIndex(-1, 0, false)).toBe(-1)
  })
})
