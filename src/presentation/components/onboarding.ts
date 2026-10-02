// Pure decision logic for OnboardingGate, kept separate from the component
// so the rules (grandfathering, the e2e escape hatch) are unit-testable
// without Dexie or React. A `KeyValueStore` mirrors profiles.ts's own type
// so a test can pass a plain object instead of real localStorage.
export type KeyValueStore = { getItem(key: string): string | null; setItem(key: string, value: string): void }

// Playwright (and other automated drivers) sets `navigator.webdriver`.
// Every existing e2e spec starts a fresh profile on '/' and expects Today
// straight away, so the gate must stay out of their way by default. The
// one override -- for the onboarding suite itself -- is `?onboarding=1` or
// this localStorage flag.
export const FORCE_ONBOARDING_KEY = 'workout-app:force-onboarding'

export function isOnboardingForced(search: string, store: KeyValueStore | null = browserStore()): boolean {
  try {
    if (new URLSearchParams(search).get('onboarding') === '1') return true
  } catch {
    // Malformed search string: fall through to the storage flag.
  }
  try {
    return store?.getItem(FORCE_ONBOARDING_KEY) === '1'
  } catch {
    return false
  }
}

function browserStore(): KeyValueStore | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}

export type OnboardingGateInputs = {
  // Settings read from the active profile's own database.
  onboardingDone: boolean
  // Grandfathering: a profile that already finished a workout, or already
  // dismissed the old Welcome card, is a current user, not a stranger --
  // never show the tour to them retroactively.
  hasFinished: boolean
  welcomeDismissed: boolean
  forced: boolean
  automated: boolean
}

export function shouldShowOnboarding({
  onboardingDone,
  hasFinished,
  welcomeDismissed,
  forced,
  automated,
}: OnboardingGateInputs): boolean {
  if (onboardingDone) return false
  if (hasFinished || welcomeDismissed) return false
  if (automated && !forced) return false
  return true
}
