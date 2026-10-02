import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isHubbyUnlocked, isRewardsAreaPath, lockHubbySession, resetHubbySessionForTests, touchHubbySession, unlockHubbySession } from './hubbySession'

// The in-memory hubby-mode session itself (unlock/touch/lock/idle timeout),
// tested as plain functions -- the mount/unmount "leaving the rewards area"
// wiring lives in the hook and is exercised by e2e/rewards.spec.ts instead,
// same as this codebase's other screen-coupled hooks (useFeedbackSettings,
// useWeightUnit) have no dedicated unit test.

beforeEach(() => {
  vi.useFakeTimers()
  resetHubbySessionForTests()
})

afterEach(() => {
  resetHubbySessionForTests()
  vi.useRealTimers()
})

describe('hubby-mode session', () => {
  it('starts locked', () => {
    expect(isHubbyUnlocked()).toBe(false)
  })

  it('unlocking flips it on; Lock flips it back off', () => {
    unlockHubbySession()
    expect(isHubbyUnlocked()).toBe(true)
    lockHubbySession()
    expect(isHubbyUnlocked()).toBe(false)
  })

  it('auto-locks after 5 minutes idle', () => {
    unlockHubbySession()
    vi.advanceTimersByTime(5 * 60 * 1000 - 1)
    expect(isHubbyUnlocked()).toBe(true)
    vi.advanceTimersByTime(1)
    expect(isHubbyUnlocked()).toBe(false)
  })

  it('a hubby action (touch) restarts the 5-minute idle clock', () => {
    unlockHubbySession()
    vi.advanceTimersByTime(4 * 60 * 1000)
    touchHubbySession()
    vi.advanceTimersByTime(4 * 60 * 1000)
    // 8 minutes have passed since unlock, but only 4 since the last touch.
    expect(isHubbyUnlocked()).toBe(true)
    vi.advanceTimersByTime(60 * 1000 + 1)
    expect(isHubbyUnlocked()).toBe(false)
  })

  it('touching while locked does nothing (no PIN entered yet)', () => {
    touchHubbySession()
    vi.advanceTimersByTime(10 * 60 * 1000)
    expect(isHubbyUnlocked()).toBe(false)
  })

  it('locking cancels the idle timer so a later tick cannot re-lock anything unexpected', () => {
    unlockHubbySession()
    lockHubbySession()
    expect(() => vi.advanceTimersByTime(10 * 60 * 1000)).not.toThrow()
    expect(isHubbyUnlocked()).toBe(false)
  })
})

describe('rewards-area route check', () => {
  it('treats /rewards and /notes as inside the area, with or without a query', () => {
    expect(isRewardsAreaPath('#/rewards')).toBe(true)
    expect(isRewardsAreaPath('#/notes')).toBe(true)
    expect(isRewardsAreaPath('#/notes?open=1')).toBe(true)
  })

  it('treats every other route as leaving the area', () => {
    expect(isRewardsAreaPath('#/')).toBe(false)
    expect(isRewardsAreaPath('#/settings')).toBe(false)
    expect(isRewardsAreaPath('#/rewardsx')).toBe(false)
    expect(isRewardsAreaPath('')).toBe(false)
  })
})
