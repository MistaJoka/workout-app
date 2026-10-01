import { describe, expect, it } from 'vitest'
import { MEADOW_ROW_CAPACITY, MEADOW_ROWS, layoutMeadow } from './meadowLayout'

const ids = (n: number): string[] => Array.from({ length: n }, (_, i) => `session-${i}`)

describe('layoutMeadow', () => {
  it('returns nothing for an empty history', () => {
    expect(layoutMeadow([])).toEqual([])
  })

  it('is deterministic: the same history always lays out the same way', () => {
    const history = ids(23)
    expect(layoutMeadow(history)).toEqual(layoutMeadow(history))
  })

  it('every spot stays inside its bounds', () => {
    const spots = layoutMeadow(ids(40))
    for (const spot of spots) {
      expect(spot.row).toBeGreaterThanOrEqual(0)
      expect(spot.row).toBeLessThan(MEADOW_ROWS)
      expect(spot.tiltDeg).toBeGreaterThanOrEqual(-5)
      expect(spot.tiltDeg).toBeLessThanOrEqual(5)
      expect(spot.liftPx).toBeGreaterThanOrEqual(-5)
      expect(spot.liftPx).toBeLessThanOrEqual(5)
      expect(spot.driftPx).toBeGreaterThanOrEqual(-10)
      expect(spot.driftPx).toBeLessThanOrEqual(10)
      expect(spot.swayDelaySec).toBeGreaterThanOrEqual(0)
      expect(spot.swayDelaySec).toBeLessThanOrEqual(2)
      expect(spot.swayDurationSec).toBeGreaterThanOrEqual(2.6)
      expect(spot.swayDurationSec).toBeLessThanOrEqual(4)
    }
  })

  it('fills rows back to front, oldest first, up to capacity per row', () => {
    const spots = layoutMeadow(ids(MEADOW_ROW_CAPACITY * 2 + 1))
    expect(spots.slice(0, MEADOW_ROW_CAPACITY).every((s) => s.row === 0)).toBe(true)
    expect(spots.slice(MEADOW_ROW_CAPACITY, MEADOW_ROW_CAPACITY * 2).every((s) => s.row === 1)).toBe(true)
    expect(spots[MEADOW_ROW_CAPACITY * 2].row).toBe(2)
  })

  it('row assignment never decreases as the garden grows (oldest stays at the back)', () => {
    const spots = layoutMeadow(ids(50))
    for (let i = 1; i < spots.length; i++) {
      expect(spots[i].row).toBeGreaterThanOrEqual(spots[i - 1].row)
    }
  })

  it('a huge garden keeps packing the frontmost row rather than growing new rows', () => {
    const spots = layoutMeadow(ids(500))
    expect(Math.max(...spots.map((s) => s.row))).toBe(MEADOW_ROWS - 1)
    expect(spots.filter((s) => s.row === MEADOW_ROWS - 1).length).toBeGreaterThan(MEADOW_ROW_CAPACITY)
  })

  it('never reshuffles: an earlier flower keeps its exact spot as later ones are added', () => {
    const full = layoutMeadow(ids(37))
    for (const prefixLength of [1, 5, 12, 20, 30]) {
      const prefix = layoutMeadow(ids(prefixLength))
      expect(prefix).toEqual(full.slice(0, prefixLength))
    }
  })

  it('two different sessions almost never land on the exact same tilt/lift/sway', () => {
    const spots = layoutMeadow(ids(10))
    const [a, b] = spots
    expect(a.tiltDeg).not.toBe(b.tiltDeg)
  })
})
