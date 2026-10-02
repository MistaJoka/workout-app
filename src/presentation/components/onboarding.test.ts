import { describe, expect, it } from 'vitest'
import { FORCE_ONBOARDING_KEY, isOnboardingForced, shouldShowOnboarding } from './onboarding'

describe('shouldShowOnboarding', () => {
  const base = { onboardingDone: false, hasFinished: false, welcomeDismissed: false, forced: false, automated: false }

  it('shows the tour to a brand new profile', () => {
    expect(shouldShowOnboarding(base)).toBe(true)
  })

  it('never shows again once onboarding finished', () => {
    expect(shouldShowOnboarding({ ...base, onboardingDone: true })).toBe(false)
  })

  it('grandfathers a profile that already finished a workout', () => {
    expect(shouldShowOnboarding({ ...base, hasFinished: true })).toBe(false)
  })

  it('grandfathers a profile that already dismissed the old Welcome card', () => {
    expect(shouldShowOnboarding({ ...base, welcomeDismissed: true })).toBe(false)
  })

  it('skips automated drivers (the rest of the e2e suite expects Today on a fresh profile)', () => {
    expect(shouldShowOnboarding({ ...base, automated: true })).toBe(false)
  })

  it('forcing overrides the automated skip, so the onboarding suite itself can drive it', () => {
    expect(shouldShowOnboarding({ ...base, automated: true, forced: true })).toBe(true)
  })

  it('forcing never overrides "already finished" -- a completed tour stays done', () => {
    expect(shouldShowOnboarding({ ...base, onboardingDone: true, forced: true })).toBe(false)
  })
})

describe('isOnboardingForced', () => {
  it('reads the ?onboarding=1 query param', () => {
    expect(isOnboardingForced('?onboarding=1', null)).toBe(true)
    expect(isOnboardingForced('?onboarding=0', null)).toBe(false)
    expect(isOnboardingForced('', null)).toBe(false)
  })

  it('falls back to the localStorage flag when there is no query param', () => {
    const store = { getItem: (k: string) => (k === FORCE_ONBOARDING_KEY ? '1' : null), setItem: () => {} }
    expect(isOnboardingForced('', store)).toBe(true)
    expect(isOnboardingForced('', { getItem: () => null, setItem: () => {} })).toBe(false)
  })

  it('a search string without the onboarding param falls through to the storage flag', () => {
    const store = { getItem: () => '1', setItem: () => {} }
    expect(isOnboardingForced('?other=1', store)).toBe(true)
  })
})
