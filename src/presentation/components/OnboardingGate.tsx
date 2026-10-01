import { useEffect, useState } from 'react'
import { getSetting, setSetting } from '../../infrastructure/db/repositories/settingsRepository'
import { db } from '../../infrastructure/db/schema'
import { activeProfile, renameProfile } from '../../infrastructure/profiles'
import { hasRealName } from '../greeting'
import { defaultWeightUnitForLocale, type WeightUnit } from '../units'
import { RaeFace, RaeFigure } from './Rae'
import { isOnboardingForced, shouldShowOnboarding } from './onboarding'

const ONBOARDING_DONE_KEY = 'onboardingDone'
const WELCOME_DISMISSED_KEY = 'welcomeDismissed'
const STEP_COUNT = 4

type Decision = 'loading' | 'hidden' | 'visible'

// A four-screen first-run tour, shown once per profile before Today ever
// shows (App.tsx mounts this beside ProfilePickGate). It never shows again
// once finished or skipped (`onboardingDone`), and a profile that already
// finished a workout or dismissed the old Welcome card is grandfathered in
// -- treated as onboarded without ever having seen this (shouldShowOnboarding).
// The point-of-risk safety line lives separately, on the Start screen
// (CheckInScreen): this is the once-ever framing, not the only warning.
export function OnboardingGate() {
  const [decision, setDecision] = useState<Decision>('loading')
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [unit, setUnit] = useState<WeightUnit>(() => defaultWeightUnitForLocale(navigator.language))

  useEffect(() => {
    let cancelled = false
    Promise.all([getSetting<boolean>(ONBOARDING_DONE_KEY), getSetting<boolean>(WELCOME_DISMISSED_KEY), db.sessionResults.count()])
      .then(([onboardingDone, welcomeDismissed, finishedCount]) => {
        if (cancelled) return
        const show = shouldShowOnboarding({
          onboardingDone: Boolean(onboardingDone),
          welcomeDismissed: Boolean(welcomeDismissed),
          hasFinished: finishedCount > 0,
          forced: isOnboardingForced(window.location.search),
          automated: navigator.webdriver === true,
        })
        setDecision(show ? 'visible' : 'hidden')
      })
      .catch(() => {
        if (!cancelled) setDecision('hidden')
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (decision !== 'visible') return null

  async function finish() {
    const trimmed = name.trim()
    if (hasRealName(trimmed)) renameProfile(activeProfile().id, trimmed)
    await setSetting('weightUnit', unit)
    await setSetting(ONBOARDING_DONE_KEY, true)
    // Today (and every other screen already mounted behind this overlay)
    // read the profile name and the weight-unit setting cache once, at
    // their own mount time -- before this ever wrote them. A reload is the
    // same fix ProfilePickGate uses when a profile changes underneath the
    // app: everything remounts and reads the now-current values.
    location.reload()
  }

  async function skip() {
    await setSetting(ONBOARDING_DONE_KEY, true)
    setDecision('hidden')
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col gap-6 bg-bg p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Foundation Strength"
    >
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5" aria-hidden="true">
          {Array.from({ length: STEP_COUNT }, (_, i) => (
            <span key={i} className={`h-2 w-2 rounded-full ${i === step ? 'bg-primary' : 'bg-edge'}`} />
          ))}
        </div>
        <button type="button" className="btn-ghost" onClick={skip}>
          Skip
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        {step === 0 && (
          <>
            <RaeFigure view="front" height={180} />
            <h1 className="text-2xl font-bold">Short guided workouts, at home, no equipment</h1>
          </>
        )}
        {step === 1 && (
          <>
            <RaeFace expression="happy" size={120} motion="none" />
            <h1 className="text-2xl font-bold">Meet Rae</h1>
            <p className="text-ink-muted">She shows every move, step by step.</p>
          </>
        )}
        {step === 2 && (
          <div className="w-full max-w-sm space-y-5 text-left">
            <h1 className="text-center text-2xl font-bold">Set up</h1>
            <label className="block space-y-1">
              <span className="block text-sm font-semibold">What should Rae call you? (optional)</span>
              <input
                type="text"
                autoComplete="given-name"
                autoCapitalize="words"
                enterKeyHint="next"
                maxLength={24}
                placeholder="Your first name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
              />
            </label>
            <div className="space-y-1">
              <span className="block text-sm font-semibold">Weight unit</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`chip ${unit === 'lb' ? 'chip-active' : ''}`}
                  aria-pressed={unit === 'lb'}
                  onClick={() => setUnit('lb')}
                >
                  lb
                </button>
                <button
                  type="button"
                  className={`chip ${unit === 'kg' ? 'chip-active' : ''}`}
                  aria-pressed={unit === 'kg'}
                  onClick={() => setUnit('kg')}
                >
                  kg
                </button>
              </div>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="w-full max-w-sm space-y-3">
            <h1 className="text-2xl font-bold">Stay safe</h1>
            <p className="text-ink-muted">
              Not a substitute for guidance from a qualified professional. Stop any movement that causes pain.
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {step > 0 && (
          <button type="button" className="btn-secondary" onClick={() => setStep((s) => s - 1)}>
            Back
          </button>
        )}
        {step < STEP_COUNT - 1 ? (
          <button type="button" className="btn-primary btn-lg flex-1" onClick={() => setStep((s) => s + 1)}>
            Next
          </button>
        ) : (
          <button type="button" className="btn-primary btn-lg flex-1" onClick={finish}>
            I understand
          </button>
        )}
      </div>
    </div>
  )
}
