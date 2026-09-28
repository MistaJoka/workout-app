import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getCurrentState, getPlan, recordEvent } from '../../application/sessionService'
import type { SessionPlan, SessionState } from '../../domain/session/types'
import { isRestComplete, remainingRestMs } from '../../domain/session/restTimer'
import { getExercises } from '../../domain/content/catalog'
import type { Exercise } from '../../domain/content/types'
import { MovementMedia, effectiveMotion, usePrefersReducedMotion } from '../components/MovementMedia'
import { RaeExerciseLoop, RaeFace } from '../components/Rae'
import { raeLoopForExercise } from '../components/raeLoops'
import { useTheme } from '../theme/ThemeContext'
import { ThumbBar } from '../components/ThumbBar'
import { ConfirmSheet } from '../components/ConfirmSheet'
import { ExerciseThumb } from '../components/ExerciseThumb'
import { getLastTimeSummary } from '../../application/lastTime'
import { primeAudio, restEndFeedback } from '../../application/restFeedback'
import { useFeedbackSettings } from '../components/useFeedbackSettings'
import { useWeightUnit } from '../components/useWeightUnit'
import { useWakeLock } from '../pwa/useWakeLock'
import { formatWeight, kgToUnit, roundToStep, stepInUnit, unitToKg } from '../units'

type ActionType = 'SET_COMPLETED' | 'REST_ENDED' | 'REST_EXTENDED' | 'REST_SKIPPED' | 'PAUSED' | 'RESUMED'

const REST_EXTENSION_MS = 15_000

// IndexedDB failures are local: never blame the network (CLAUDE.md).
const SAVE_ERROR = "Couldn't save on this device. Try again."

export function WorkoutPlayerScreen() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  // Keep the screen awake for the whole workout; released when leaving.
  useWakeLock(true)
  const [plan, setPlan] = useState<SessionPlan | null>(null)
  const [state, setState] = useState<SessionState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [awaitingRepCheck, setAwaitingRepCheck] = useState(false)
  const [exerciseById, setExerciseById] = useState<Map<string, Exercise>>(new Map())
  const [lastTime, setLastTime] = useState<string | null>(null)
  const [feedback] = useFeedbackSettings()
  const [unit] = useWeightUnit()
  // Load actually used for the set being logged (kg); null = use the plan's.
  const [loggedWeightKg, setLoggedWeightKg] = useState<number | null>(null)
  const [confirmingEnd, setConfirmingEnd] = useState(false)
  const [endError, setEndError] = useState<string | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  const refresh = useCallback(async () => {
    if (!sessionId) return
    setLoadFailed(false)
    let loadedPlan: SessionPlan | undefined
    try {
      const [p, loadedState] = await Promise.all([getPlan(sessionId), getCurrentState(sessionId)])
      loadedPlan = p
      setPlan(p ?? null)
      setState(loadedState)
    } catch {
      setLoadFailed(true)
      return
    }
    // Steps and media are extras: the sets and timers work without them
    // (e.g. the library chunk isn't cached yet and the phone is offline).
    if (loadedPlan) {
      try {
        setExerciseById(await getExercises(loadedPlan.exercises.map((e) => e.exerciseId)))
      } catch {
        // keep the player usable; names come from the plan
      }
    }
  }, [sessionId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!sessionId) return
    if (state?.status === 'COMPLETED' || state?.status === 'COMPLETED_SHORTENED') {
      navigate(`/session/${sessionId}/complete`, { replace: true })
    }
  }, [state, sessionId, navigate])

  const currentExerciseId = plan && state ? plan.exercises[state.currentExerciseIndex]?.exerciseId : undefined
  useEffect(() => {
    if (!currentExerciseId) return
    let cancelled = false
    setLastTime(null)
    getLastTimeSummary(currentExerciseId).then((summary) => {
      if (!cancelled) setLastTime(summary)
    })
    return () => {
      cancelled = true
    }
  }, [currentExerciseId])

  // A logged weight carries across the sets of one exercise (you rarely
  // change plates mid-exercise) but never into the next exercise.
  useEffect(() => {
    setLoggedWeightKg(null)
  }, [state?.currentExerciseIndex])

  async function handleAction(type: ActionType, payload: Record<string, unknown> = {}) {
    if (!sessionId) return
    setBusy(true)
    setError(null)
    try {
      const next = await recordEvent(sessionId, type, crypto.randomUUID(), payload)
      setState(next)
      setAwaitingRepCheck(false)
    } catch {
      setError(SAVE_ERROR)
    } finally {
      setBusy(false)
    }
  }

  function handleCompleteSetClick(exerciseId: string, isRepsBased: boolean) {
    // User gesture: unlock audio so the rest-end chime can play later (iOS).
    if (feedback.sound) primeAudio()
    if (!isRepsBased) {
      // Hold/time-based exercises (e.g. Plank) aren't evaluated by the
      // reps-only v1 progression policy, so there's no "met" to record.
      void handleAction('SET_COMPLETED', { exerciseId })
      return
    }
    setAwaitingRepCheck(true)
  }

  // Ending early still finishes on the Complete screen: the "you're done"
  // moment, and any Try Next Level offer the finished sets earned.
  async function handleEndWorkout() {
    if (!sessionId) return
    setBusy(true)
    setEndError(null)
    try {
      await recordEvent(sessionId, 'SESSION_COMPLETED_SHORTENED', crypto.randomUUID())
      navigate(`/session/${sessionId}/complete`, { replace: true })
    } catch {
      setEndError(SAVE_ERROR)
      setBusy(false)
    }
  }

  function openEndSheet() {
    setEndError(null)
    setConfirmingEnd(true)
  }

  const endSheet = confirmingEnd ? (
    <ConfirmSheet
      title="End workout?"
      confirmLabel="End workout"
      cancelLabel="Keep going"
      busy={busy}
      error={endError}
      onConfirm={handleEndWorkout}
      onCancel={() => setConfirmingEnd(false)}
    >
      Your finished sets are saved.
    </ConfirmSheet>
  ) : null

  if (loadFailed) {
    return (
      <div className="p-6 pt-16 text-center space-y-4">
        <p className="text-lg font-bold">Couldn't open this workout.</p>
        <button className="btn-primary btn-lg w-full" onClick={() => void refresh()}>
          Try again
        </button>
        <Link to="/" className="btn-ghost min-h-11">
          Back to Today
        </Link>
      </div>
    )
  }

  if (!plan || !state) {
    return <div className="p-4">Loading…</div>
  }

  if (state.status === 'PAUSED') {
    return (
      <div className="p-6 pt-16 pb-32 text-center space-y-4">
        <RaeFace expression="smile" size={112} motion="pop" className="mx-auto" />
        <p className="text-2xl font-bold">Take your time</p>
        <p className="text-ink-muted">
          {plan.exercises[state.currentExerciseIndex]?.name}, set {state.currentSetNumber}
        </p>
        {error && <p className="text-sm text-accent">{error}</p>}
        <button className="btn-ghost min-h-11" disabled={busy} onClick={openEndSheet}>
          End workout
        </button>
        {endSheet}
        <ThumbBar armKey="paused">
          <button className="btn-primary btn-lg w-full" disabled={busy} onClick={() => handleAction('RESUMED')}>
            Resume
          </button>
        </ThumbBar>
      </div>
    )
  }

  if (state.status === 'RESTING' && state.restEndsAt) {
    const upNext = plan.exercises[state.currentExerciseIndex]
    return (
      <RestingView
        upNext={upNext}
        upNextContent={upNext ? exerciseById.get(upNext.exerciseId) : undefined}
        setNumber={state.currentSetNumber}
        restStartedAt={state.restStartedAt}
        restEndsAt={state.restEndsAt}
        busy={busy}
        error={error}
        onRestComplete={() => {
          restEndFeedback(feedback)
          void handleAction('REST_ENDED')
        }}
        // Persisted like every other session action, so a refresh or
        // reopen mid-rest keeps the extended deadline.
        onExtend={() => handleAction('REST_EXTENDED', { byMs: REST_EXTENSION_MS })}
        onSkip={() => handleAction('REST_SKIPPED')}
        onPause={() => handleAction('PAUSED')}
      />
    )
  }

  const exercise = plan.exercises[state.currentExerciseIndex]
  if (!exercise) {
    return <div className="p-4">Loading…</div>
  }

  const exerciseContent = exerciseById.get(exercise.exerciseId)
  const weighted = exercise.weightKg != null
  const setWeightKg = loggedWeightKg ?? exercise.weightKg ?? 0

  return (
    <div className="p-6 pb-40 space-y-4">
      {/* Rare actions live up here, out of the thumb bar: End workout used
          to sit exactly where the rest screen's "Skip rest" is (a double tap
          ended the session), and mid-set there's no timer to pause, so
          Pause only crowded Complete Set. */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RaeFace expression="focused" size={36} motion="none" />
          <p className="text-sm text-ink-muted">
            Exercise {state.currentExerciseIndex + 1} of {plan.exercises.length}
          </p>
        </div>
        <div className="-mr-3 flex">
          <button className="btn-ghost min-h-11" disabled={busy} onClick={() => handleAction('PAUSED')}>
            Pause
          </button>
          <button className="btn-ghost min-h-11" disabled={busy} onClick={openEndSheet}>
            End workout
          </button>
        </div>
      </div>
      <h2 className="text-2xl font-bold">{exercise.name}</h2>
      <p className="text-lg font-semibold">
        Set {state.currentSetNumber} of {exercise.sets}
        {exercise.reps ? ` — ${exercise.reps} reps` : exercise.timeSeconds ? ` — ${exercise.timeSeconds}s hold` : ''}
        {weighted ? ` @ ${formatWeight(setWeightKg, unit)}` : ''}
      </p>
      {lastTime && <p className="text-sm text-ink-muted">{lastTime}</p>}

      {exerciseContent && (
        <MovementMedia
          name={exerciseContent.name}
          exerciseId={exerciseContent.id}
          start={exerciseContent.mediaManifest.start}
          finish={exerciseContent.mediaManifest.finish}
        />
      )}

      {exerciseContent && (exerciseContent.setup || exerciseContent.executionPhases.length > 0) && (
        <StepsList key={exercise.exerciseId} steps={[exerciseContent.setup, ...exerciseContent.executionPhases].filter(Boolean)} />
      )}

      {error && <p className="text-sm text-accent">{error}</p>}
      {endSheet}
      {awaitingRepCheck && weighted && (
        <div className="flex items-center justify-center gap-6 rounded-panel bg-bg p-2">
          <button
            type="button"
            className="stepper-btn"
            aria-label="Less weight"
            onClick={() => setLoggedWeightKg(Math.max(0, unitToKg(roundToStep(kgToUnit(setWeightKg, unit), unit) - stepInUnit(unit), unit)))}
          >
            −
          </button>
          <span className="hud-num font-semibold tabular-nums">{formatWeight(setWeightKg, unit)}</span>
          <button
            type="button"
            className="stepper-btn"
            aria-label="More weight"
            onClick={() => setLoggedWeightKg(unitToKg(roundToStep(kgToUnit(setWeightKg, unit), unit) + stepInUnit(unit), unit))}
          >
            +
          </button>
        </div>
      )}

      {/* Complete Set is the most-tapped control in the app — pinned to a
          fixed bottom bar so it's always in thumb reach regardless of how
          much media/instruction content is above it. */}
      <ThumbBar
        armKey={`${state.currentExerciseIndex}:${state.currentSetNumber}:${awaitingRepCheck}`}
        className="space-y-2"
      >
        {awaitingRepCheck ? (
          <>
            <p className="text-sm text-center">Did you complete all {exercise.reps} reps?</p>
            <div className="flex gap-2">
              <button
                className="btn-secondary flex-1"
                disabled={busy}
                onClick={() =>
                  handleAction('SET_COMPLETED', {
                    exerciseId: exercise.exerciseId,
                    met: false,
                    ...(weighted ? { weightKg: setWeightKg } : {}),
                  })
                }
              >
                No, fell short
              </button>
              <button
                className="btn-primary flex-1"
                disabled={busy}
                onClick={() =>
                  handleAction('SET_COMPLETED', {
                    exerciseId: exercise.exerciseId,
                    met: true,
                    ...(weighted ? { weightKg: setWeightKg } : {}),
                  })
                }
              >
                Yes
              </button>
            </div>
          </>
        ) : (
          <button
            className="btn-primary btn-lg w-full"
            disabled={busy}
            onClick={() => handleCompleteSetClick(exercise.exerciseId, exercise.reps != null)}
          >
            Complete Set
          </button>
        )}
      </ThumbBar>
    </div>
  )
}

const STEPS_SHOWN = 3
const STEPS_CHAR_BUDGET = 480

// Library instructions can run to 6+ long steps; the first few (bounded by
// count and by length, since one upstream step can be a paragraph) plus the
// photos carry the movement, and the Complete Set button must stay on a
// phone screen. The rest is one tap away; the list is keyed by exercise id
// so it remounts (collapsed) when the exercise changes.
function initialStepCount(steps: string[]): number {
  let chars = 0
  let count = 0
  for (const step of steps) {
    if (count >= STEPS_SHOWN) break
    if (count > 0 && chars + step.length > STEPS_CHAR_BUDGET) break
    chars += step.length
    count += 1
  }
  return Math.max(1, count)
}

function StepsList({ steps }: { steps: string[] }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? steps : steps.slice(0, initialStepCount(steps))
  const hidden = steps.length - visible.length
  return (
    <div className="space-y-1.5">
      <ol className="space-y-1.5 text-sm leading-snug">
        {visible.map((step, i) => (
          <li key={i} className="flex gap-2">
            <span className="font-semibold text-ink-muted">{i + 1}.</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      {hidden > 0 && (
        <button type="button" className="text-sm text-primary" onClick={() => setExpanded(true)}>
          Show {hidden} more {hidden === 1 ? 'step' : 'steps'}
        </button>
      )}
    </div>
  )
}

// Decoration over the numeric timer (which stays the source of truth):
// the share of this rest still left, from the persisted timestamps.
function RestBar({ restStartedAt, restEndsAt, seconds }: { restStartedAt: string | null; restEndsAt: string; seconds: number }) {
  if (!restStartedAt) return null
  const totalMs = Date.parse(restEndsAt) - Date.parse(restStartedAt)
  if (!(totalMs > 0)) return null
  const left = Math.min(1, Math.max(0, (seconds * 1000) / totalMs))
  return (
    <div className="rest-bar mx-auto max-w-xs" aria-hidden="true">
      <div className="rest-bar__fill" style={{ width: `${left * 100}%` }} />
    </div>
  )
}

function secondsUntil(restEndsAt: string): number {
  return Math.ceil(remainingRestMs(restEndsAt) / 1000)
}

function RestingView({
  upNext,
  upNextContent,
  setNumber,
  restStartedAt,
  restEndsAt,
  busy,
  error,
  onRestComplete,
  onExtend,
  onSkip,
  onPause,
}: {
  // During rest the session already points at the coming set.
  upNext: { exerciseId: string; name: string } | undefined
  upNextContent: Exercise | undefined
  setNumber: number
  restStartedAt: string | null
  restEndsAt: string
  busy: boolean
  error: string | null
  onRestComplete: () => void
  onExtend: () => void
  onSkip: () => void
  onPause: () => void
}) {
  // The timer derives from the persisted restEndsAt alone (+15s moves that
  // timestamp via REST_EXTENDED), so a refresh mid-rest shows the same
  // countdown. State holds whole seconds: the 250ms tick keeps the display
  // honest at second boundaries but React bails out on the equal value, so
  // the view re-renders once per second, not four times.
  const [seconds, setSeconds] = useState(() => secondsUntil(restEndsAt))
  // Latest callback in a ref so the interval never calls a stale closure
  // (e.g. feedback settings that arrived after the rest started).
  const onRestCompleteRef = useRef(onRestComplete)
  onRestCompleteRef.current = onRestComplete

  useEffect(() => {
    setSeconds(secondsUntil(restEndsAt))
    const interval = setInterval(() => {
      setSeconds(secondsUntil(restEndsAt))
      if (isRestComplete(restEndsAt)) {
        clearInterval(interval)
        onRestCompleteRef.current()
      }
    }, 250)
    return () => clearInterval(interval)
  }, [restEndsAt])

  return (
    <div className="field-calm min-h-screen rounded-none p-6 pt-16 pb-32 text-center space-y-6">
      <div className="flex justify-end">
        <button className="btn-ghost min-h-11 -mr-3 -mt-10" disabled={busy} onClick={onPause}>
          Pause
        </button>
      </div>
      <RaeFace expression="tired" size={88} className="mx-auto" />
      <p className="text-lg font-bold">Rest</p>
      <p
        className="hud-num text-7xl font-extrabold tabular-nums"
        role="timer"
      >
        {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
      </p>
      <RestBar restStartedAt={restStartedAt} restEndsAt={restEndsAt} seconds={seconds} />
      {upNext && <UpNext exerciseId={upNext.exerciseId} name={upNext.name} content={upNextContent} setNumber={setNumber} />}
      {error && <p className="text-sm text-accent">{error}</p>}
      {/* Skip rest is the tap after nearly every rest: primary, full reach.
          +15s beside it; Pause (a phone call, a doorbell) stays up top. */}
      <ThumbBar armKey="rest" className="flex gap-2">
        <button className="btn-secondary" disabled={busy} onClick={onExtend}>
          +15s
        </button>
        <button className="btn-primary btn-lg flex-1" disabled={busy} onClick={onSkip}>
          Skip rest
        </button>
      </ThumbBar>
    </div>
  )
}

// Rest previews what's coming: Rae's loop for the next move, small, under
// the timer (which stays the focus). The exercise's photo when Rae doesn't
// demonstrate that move yet.
function UpNext({
  exerciseId,
  name,
  content,
  setNumber,
}: {
  exerciseId: string
  name: string
  content: Exercise | undefined
  setNumber: number
}) {
  const { motion } = useTheme()
  const osPrefersReduced = usePrefersReducedMotion()
  const loop = raeLoopForExercise(exerciseId)
  return (
    <div className="space-y-1">
      <p className="text-sm font-semibold text-ink-muted">
        Up next: {name}
        {setNumber > 1 ? `, set ${setNumber}` : ''}
      </p>
      {loop && (
        <RaeExerciseLoop
          id={loop.id}
          name={name.toLowerCase()}
          width={loop.width}
          height={loop.height}
          stills={loop.stills}
          animate={effectiveMotion(motion, osPrefersReduced) === 'full'}
          imgClassName="max-h-[20vh] w-auto"
        />
      )}
      {!loop && content?.mediaManifest.start && (
        <ExerciseThumb exercise={content} className="mx-auto h-[20vh] w-auto max-w-full rounded-panel" />
      )}
    </div>
  )
}
