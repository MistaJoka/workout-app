import { describe, expect, it } from 'vitest'
import { UPDATE_CHECK_MS, shouldCheckForUpdate } from './registerServiceWorker'

describe('shouldCheckForUpdate', () => {
  it('waits out the interval after the last check', () => {
    expect(shouldCheckForUpdate(1000 + UPDATE_CHECK_MS - 1, 1000)).toBe(false)
  })

  it('checks once the interval has passed', () => {
    expect(shouldCheckForUpdate(1000 + UPDATE_CHECK_MS, 1000)).toBe(true)
  })
})
