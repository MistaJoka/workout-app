import { describe, expect, it } from 'vitest'
import { shouldPreload } from './preloadScreens'

describe('shouldPreload', () => {
  it('waits during a workout and never runs on Data Saver', () => {
    expect(shouldPreload('#/', false)).toBe(true)
    expect(shouldPreload('#/session/abc', false)).toBe(false)
    expect(shouldPreload('#/', true)).toBe(false)
  })
})
