import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getCurrentState, getPlan, recordEvent } from '../../application/sessionService'
import type { SessionPlan, SessionState } from '../../domain/session/types'
import { isRestComplete, remainingRestMs } from '../../domain/session/restTimer'
import { getExercises } from '../../domain/content/catalog'
import type { Exercise } from '../../domain/content/types'
import { MovementMedia } from '../components/MovementMedia'
import { getLastTimeSummary } from '../../application/lastTime'
import { primeAudio, restEndFeedback } from '../../application/restFeedback'
import { useFeedbackSettings } from '../components/useFeedbackSettings'
import { useWeightUnit } from '../components/useWeightUnit'
import { formatWeight, kgToUnit, roundToStep, stepInUnit, unitToKg } from '../units'

type ActionType = 'SET_COMPLETED' | 'REST_ENDED' | 'REST_SKIPPED' | 'PAUSED' | 'RESUMED'

const REST_EXTENSION_MS = 15_000

export function WorkoutPlayerScreen() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [plan, setPlan] = useState<SessionPlan | null>(null)
  const [state, setState] = useState<SessionState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [awaitingRepCheck, setAwaitingRepCheck] = useState(false)
  const [exerciseById, setExerciseById] = useState<Map<string, Exercise>>(new Map())
  const [lastTime, setLastTime] = useState<string | null>(null)
  // UI-local only: extends the displayed rest without touching the persisted
  // state machine (restEndsAt derives from SET_COMPLETED + restSeconds).
  const [restExtensionMs, setRestExtensionMs] = useState(0)
  const [feedback] = useFeedbackSettings()
  const [unit] = useWeightUnit()
  // Load actually used for the set being logged (kg); null = use the plan's.
  const [loggedWeightKg, setLoggedWeightKg] = useState<number | null>(null)

  const refresh = useCallback(async () => {
    if (!sessionId) return
    const [loadedPlan, loadedState] = await Promise.all([getPlan(sessionId), getCurrentState(sessionId)])
    setPlan(loadedPlan ?? null)
    setState(loadedState)
    if (loadedPlan) setExerciseById(await getExercises(loadedPlan.exercises.map((e) => e.exerciseId)))
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

  // A new rest period (new restEndsAt) always starts unextended.
  useEffect(() => {
    setRestExtensionMs(0)
  }, [state?.restEndsAt])

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
      setError('Could not save — check your connection and try again.')
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

  async function handleEndWorkout() {
    if (!sessionId) return
    setBusy(true)
    setError(null)
    try {
      await recordEvent(sessionId, 'SESSION_COMPLETED_SHORTENED', crypto.randomUUID())
      navigate('/')
    } catch {
      setError('Could not end the workout — please try again.')
      setBusy(false)
    }
  }

  if (!plan || !state) {
    return <div className="p-4">Loading…</div>
  }

  if (state.status === 'PAUSED') {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-lg">Paused</p>
        {error && <p className="text-sm text-accent">{error}</p>}
        <button className="rounded-panel bg-primary px-4 py-2 text-white" disabled={busy} onClick={() => handleAction('RESUMED')}>
          Resume
        </button>
      </div>
    )
  }

  if (state.status === 'RESTING' && state.restEndsAt) {
    return (
      <RestingView
        restEndsAt={state.restEndsAt}
        extensionMs={restExtensionMs}
        busy={busy}
        error={error}
        onRestComplete={() => {
          restEndFeedback(feedback)
          void handleAction('REST_ENDED')
        }}
        onExtend={() => setRestExtensionMs((ms) => ms + REST_EXTENSION_MS)}
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
    <div className="p-6 space-y-4">
      <p className="text-sm text-ink-muted">
        Exercise {state.currentExerciseIndex + 1} of {plan.exercises.length}
      </p>
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
          start={exerciseContent.mediaManifest.start}
          finish={exerciseContent.mediaManifest.finish}
        />
      )}

      {exerciseContent && (exerciseContent.setup || exerciseContent.executionPhases.length > 0) && (
        <StepsList steps={[exerciseContent.setup, ...exerciseContent.executionPhases].filter(Boolean)} exerciseId={exercise.exerciseId} />
      )}

      {error && <p className="text-sm text-accent">{error}</p>}
      {awaitingRepCheck ? (
        <div className="space-y-3">
          {weighted && (
            <div className="flex items-center justify-between rounded-panel bg-bg p-2">
              <button
                type="button"
                className="h-11 w-11 rounded-full border border-edge bg-surface text-xl"
                aria-label="Less weight"
                onClick={() => setLoggedWeightKg(Math.max(0, unitToKg(roundToStep(kgToUnit(setWeightKg, unit), unit) - stepInUnit(unit), unit)))}
              >
                −
              </button>
              <span className="font-semibold tabular-nums">{formatWeight(setWeightKg, unit)}</span>
              <button
                type="button"
                className="h-11 w-11 rounded-full border border-edge bg-surface text-xl"
                aria-label="More weight"
                onClick={() => setLoggedWeightKg(unitToKg(roundToStep(kgToUnit(setWeightKg, unit), unit) + stepInUnit(unit), unit))}
              >
                +
              </button>
            </div>
          )}
          <p className="text-sm">Did you complete all {exercise.reps} reps?</p>
          <div className="flex gap-2">
            <button
              className="rounded-panel bg-primary px-4 py-2 text-white"
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
            <button
              className="rounded-panel border border-edge px-4 py-2"
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
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button className="rounded-panel border border-edge px-4 py-2" disabled={busy} onClick={() => handleAction('PAUSED')}>
            Pause
          </button>
          <button
            className="rounded-panel bg-primary px-4 py-2 text-white"
            disabled={busy}
            onClick={() => handleCompleteSetClick(exercise.exerciseId, exercise.reps != null)}
          >
            Complete Set
          </button>
        </div>
      )}
      <button className="text-sm text-ink-muted underline" disabled={busy} onClick={handleEndWorkout}>
        End workout
      </button>
    </div>
  )
}

const STEPS_SHOWN = 3
const STEPS_CHAR_BUDGET = 480

// Library instructions can run to 6+ long steps; the first few (bounded by
// count and by length, since one upstream step can be a paragraph) plus the
// photos carry the movement, and the Complete Set button must stay on a
// phone screen. The rest is one tap away and re-collapses per exercise.
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

function StepsList({ steps, exerciseId }: { steps: string[]; exerciseId: string }) {
  const [expanded, setExpanded] = useState(false)
  useEffect(() => {
    setExpanded(false)
  }, [exerciseId])
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

function RestingView({
  restEndsAt,
  extensionMs,
  busy,
  error,
  onRestComplete,
  onExtend,
  onSkip,
  onPause,
}: {
  restEndsAt: string
  extensionMs: number
  busy: boolean
  error: string | null
  onRestComplete: () => void
  onExtend: () => void
  onSkip: () => void
  onPause: () => void
}) {
  // The extension shifts the deadline the timer counts toward; the persisted
  // restEndsAt is untouched, so a refresh mid-rest drops the extension —
  // acceptable for a UI-local nicety.
  const effectiveEndsAt = new Date(new Date(restEndsAt).getTime() + extensionMs).toISOString()
  const [remainingMs, setRemainingMs] = useState(() => remainingRestMs(effectiveEndsAt))

  useEffect(() => {
    setRemainingMs(remainingRestMs(effectiveEndsAt))
    const interval = setInterval(() => {
      setRemainingMs(remainingRestMs(effectiveEndsAt))
      if (isRestComplete(effectiveEndsAt)) {
        clearInterval(interval)
        onRestComplete()
      }
    }, 250)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveEndsAt])

  const seconds = Math.ceil(remainingMs / 1000)

  return (
    <div className="p-6 text-center space-y-6">
      <p className="text-lg">Rest</p>
      <p className="text-6xl font-bold tabular-nums" role="timer">
        {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
      </p>
      {error && <p className="text-sm text-accent">{error}</p>}
      <div className="flex justify-center gap-2">
        <button className="rounded-panel border border-edge px-4 py-2" disabled={busy} onClick={onPause}>
          Pause
        </button>
        <button className="rounded-panel border border-edge px-4 py-2" disabled={busy} onClick={onExtend}>
          +15s
        </button>
        <button className="rounded-panel border border-edge px-4 py-2" disabled={busy} onClick={onSkip}>
          Skip rest
        </button>
      </div>
    </div>
  )
}
