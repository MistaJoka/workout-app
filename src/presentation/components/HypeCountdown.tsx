import { useEffect, useRef, useState } from 'react'
import { RaeFace } from './Rae'
import { playCountdownTick } from '../../application/restFeedback'
import { fireSetBurst } from './SetBurst'
import type { MotionPreference } from '../theme/tokens'

export type HypePhase = '3' | '2' | '1' | 'go'

type HypeStep = { phase: HypePhase; ms: number }

const FULL_STEP_MS = 550
const OFF_STEP_MS = 800

// The countdown's own schedule, kept pure (no DOM/WebAudio) so it's
// unit-testable on its own. Full and reduced motion share the same four
// ~550ms beats (3, 2, 1, "Let's go!" — about 2.2s total; only the
// per-number transition style differs, in the component below). The
// countdown itself isn't information (CLAUDE.md: a motion setting must
// never remove information — what it protects here is "a fresh workout
// started" and "up first: <move>", both still shown), so off motion skips
// the numbers and shows one short "Let's go!" beat instead of four.
export function hypeSchedule(motion: MotionPreference): HypeStep[] {
  if (motion === 'off') return [{ phase: 'go', ms: OFF_STEP_MS }]
  return [
    { phase: '3', ms: FULL_STEP_MS },
    { phase: '2', ms: FULL_STEP_MS },
    { phase: '1', ms: FULL_STEP_MS },
    { phase: 'go', ms: FULL_STEP_MS },
  ]
}

export function hypeTotalMs(motion: MotionPreference): number {
  return hypeSchedule(motion).reduce((sum, step) => sum + step.ms, 0)
}

// Lets a dedicated e2e test (e2e/hype.spec.ts) force the overlay on even
// though it runs under WebDriver (see shouldSkipForAutomation below), via
// `?hype=1` in the URL.
export function hasHypeQueryFlag(search: string): boolean {
  try {
    return new URLSearchParams(search).get('hype') === '1'
  } catch {
    return false
  }
}

// Real users never carry `navigator.webdriver`; Playwright's Chromium
// always does. The whole existing e2e suite drives the player immediately
// after Start (e2e/helpers.ts `finishWorkout` and many specs), so by
// default automation never sees this overlay at all — the one dedicated
// spec that wants it opts back in with the query flag or the localStorage
// flag above.
export function shouldSkipForAutomation(search: string): boolean {
  if (typeof navigator === 'undefined' || navigator.webdriver !== true) return false
  if (hasHypeQueryFlag(search)) return false
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('hype') === '1') return false
  } catch {
    // Private mode or a disabled store: fall through to skipping.
  }
  return true
}

type Props = {
  firstMoveName: string
  motion: MotionPreference
  sound: boolean
  onDone: () => void
}

// A short anticipation beat right as a fresh workout opens: Rae cheering,
// 3-2-1, "Let's go!" with a pixel burst, and the first move named
// underneath. Tapping anywhere skips straight to the player it sits over
// (that player is already fully mounted and working underneath — starting
// a workout must stay fast, CLAUDE.md), and it also ends on its own well
// under 2.5s either way.
export function HypeCountdown({ firstMoveName, motion, sound, onDone }: Props) {
  const schedule = hypeSchedule(motion)
  const [index, setIndex] = useState(0)
  const doneRef = useRef(false)
  const burstFiredRef = useRef(false)

  function finish() {
    if (doneRef.current) return
    doneRef.current = true
    onDone()
  }

  const step = schedule[index]

  useEffect(() => {
    if (!step) {
      finish()
      return
    }
    if (sound && step.phase !== 'go') playCountdownTick()
    if (step.phase === 'go' && motion === 'full' && !burstFiredRef.current) {
      burstFiredRef.current = true
      fireSetBurst()
    }
    const timer = window.setTimeout(() => {
      if (index + 1 >= schedule.length) finish()
      else setIndex(index + 1)
    }, step.ms)
    return () => window.clearTimeout(timer)
    // step/schedule are derived from index+motion; only index should retrigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  const transitionClass = motion === 'reduced' ? 'hype-fade' : motion === 'full' ? 'hype-pop' : ''

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      data-testid="hype-countdown"
      onClick={finish}
    >
      <style>{HYPE_STYLE}</style>
      {/* The animated beats are flavor; this announces the one fact they
          carry (a fresh workout, and what's up first) at once, for anyone
          not watching the overlay pop through its numbers. */}
      <p className="sr-only" role="status">
        Starting your workout. Up first: {firstMoveName}.
      </p>
      <div className="mx-6 w-full max-w-xs space-y-3 rounded-panel bg-surface p-8 text-center shadow-lg">
        <div className="flex justify-center">
          <RaeFace expression="cheer" size={88} motion={motion === 'full' ? 'pop' : 'none'} decorative />
        </div>
        {step?.phase !== 'go' ? (
          <p key={step?.phase} aria-hidden="true" className={`hud-num text-7xl font-extrabold leading-none text-primary ${transitionClass}`}>
            {step?.phase}
          </p>
        ) : (
          <p key="go" aria-hidden="true" className={`text-3xl font-extrabold text-primary-ink ${transitionClass}`}>
            Let&apos;s go!
          </p>
        )}
        <p aria-hidden="true" className="text-sm font-semibold text-ink-muted">
          Up first: {firstMoveName}
        </p>
      </div>
    </div>
  )
}

const HYPE_STYLE = `
@keyframes hype-pop-in { 0% { transform: scale(0.6); opacity: 0.3; } 60% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
@keyframes hype-fade-in { from { opacity: 0; } to { opacity: 1; } }
.hype-pop { animation: hype-pop-in 260ms cubic-bezier(0.3, 1.6, 0.5, 1) both; }
.hype-fade { animation: hype-fade-in 220ms ease-out both !important; }
`
