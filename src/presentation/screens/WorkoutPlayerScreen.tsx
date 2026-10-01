import { useCallback, useEffect, useRef, useState } from 'react'
import { newId } from '../../shared/id'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getCurrentState, getPlan, recordEvent } from '../../application/sessionService'
import type { SessionPlan, SessionPlanExercise, SessionState } from '../../domain/session/types'
import { getExercises } from '../../domain/content/catalog'
import { getFamiliarExerciseIds } from '../../application/familiarity'
import type { Exercise } from '../../domain/content/types'
import { MovementMedia, effectiveMotion, usePrefersReducedMotion } from '../components/MovementMedia'
import { RaeExerciseLoop, RaeFace } from '../components/Rae'
import { raeLoopForExercise } from '../components/raeLoops'
import { useTheme } from '../theme/ThemeContext'
import { ThumbBar } from '../components/ThumbBar'
import { RepPicks } from '../components/RepPicks'
import { ConfirmSheet } from '../components/ConfirmSheet'
import { ExerciseThumb } from '../components/ExerciseThumb'
import { RestRing } from '../components/RestRing'
import { SetDots } from '../components/SetDots'
import { WorkoutProgressBar } from '../components/WorkoutProgressBar'
import { WorkoutOverviewSheet } from '../components/WorkoutOverviewSheet'
import { useCountdown } from '../components/useCountdown'
import { getLastTimeSummary } from '../../application/lastTime'
import { primeAudio, restEndFeedback } from '../../application/restFeedback'
import { useFeedbackSettings } from '../components/useFeedbackSettings'
import { useWeightUnit } from '../components/useWeightUnit'
import { useWakeLock } from '../pwa/useWakeLock'
import { formatWeight, kgToUnit, roundToStep, stepInUnit, unitToKg } from '../units'
import { Skeleton, SkeletonBlock, SkeletonHeading } from '../components/Skeleton'

type ActionType =
  | 'SET_COMPLETED'
  | 'REST_ENDED'
  | 'REST_EXTENDED'
  | 'REST_SKIPPED'
  | 'PAUSED'
  | 'RESUMED'
  | 'HOLD_STARTED'
  | 'EXERCISE_SKIPPED'
  | 'SET_UNDONE'

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
  // "No, fell short": the reps actually done, logged with the set.
  const [shortReps, setShortReps] = useState<number | null>(null)
  // "Other" on the quick picks: the stepper, for counts further off.
  const [repsOther, setRepsOther] = useState(false)
  // Set by an undo (a set taken back, or a rep check backed out of) so the
  // player's live region tells screen readers what just happened.
  const [undoNotice, setUndoNotice] = useState(false)
  const [exerciseById, setExerciseById] = useState<Map<string, Exercise>>(new Map())
  const [lastTime, setLastTime] = useState<string | null>(null)
  const [feedback] = useFeedbackSettings()
  const [unit] = useWeightUnit()
  // Load actually used for the set being logged (kg); null = use the plan's.
  const [loggedWeightKg, setLoggedWeightKg] = useState<number | null>(null)
  const [confirmingEnd, setConfirmingEnd] = useState(false)
  const [endError, setEndError] = useState<string | null>(null)
  const [confirmingSkip, setConfirmingSkip] = useState(false)
  const [showingOverview, setShowingOverview] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  // Familiar moves start with their steps folded away; opening one keeps it
  // open for the rest of this session (not persisted).
  const [familiarIds, setFamiliarIds] = useState<ReadonlySet<string>>(new Set())
  const [openedIds, setOpenedIds] = useState<ReadonlySet<string>>(new Set())

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
      const ids = loadedPlan.exercises.map((e) => e.exerciseId)
      try {
        // Loaded together so the steps first paint already collapsed or
        // open; a failed familiarity read just means every move shows steps.
        const [exercises, familiar] = await Promise.all([
          getExercises(ids),
          getFamiliarExerciseIds(ids).catch(() => new Set<string>()),
        ])
        setFamiliarIds(familiar)
        setExerciseById(exercises)
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
    getLastTimeSummary(currentExerciseId)
      .then((summary) => {
        if (!cancelled) setLastTime(summary)
      })
      // "Last time" is a nicety; a failed read just leaves it out.
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [currentExerciseId])

  // A logged weight carries across the sets of one exercise (you rarely
  // change plates mid-exercise) but never into the next exercise.
  useEffect(() => {
    setLoggedWeightKg(null)
  }, [state?.currentExerciseIndex])

  async function handleAction(type: ActionType, payload: Record<string, unknown> = {}): Promise<boolean> {
    if (!sessionId) return false
    setBusy(true)
    setError(null)
    try {
      const next = await recordEvent(sessionId, type, newId(), payload)
      setState(next)
      setAwaitingRepCheck(false)
      setShortReps(null)
      setRepsOther(false)
      setUndoNotice(type === 'SET_UNDONE')
      return true
    } catch {
      setError(SAVE_ERROR)
      return false
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

  // Backs out of the rep check before anything is stored: the set wasn't
  // logged yet, so "undo" here is just going back to it.
  function cancelRepCheck() {
    setAwaitingRepCheck(false)
    setShortReps(null)
    setRepsOther(false)
    setUndoNotice(true)
  }

  function handleStartHold() {
    if (feedback.sound) primeAudio()
    void handleAction('HOLD_STARTED')
  }

  // Ending early still finishes on the Complete screen: the "you're done"
  // moment, and any Try Next Level offer the finished sets earned.
  async function handleEndWorkout() {
    if (!sessionId) return
    setBusy(true)
    setEndError(null)
    try {
      await recordEvent(sessionId, 'SESSION_COMPLETED_SHORTENED', newId())
      navigate(`/session/${sessionId}/complete`, { replace: true })
    } catch {
      setEndError(SAVE_ERROR)
      setBusy(false)
    }
  }

  async function handleSkipMove() {
    // A failed save keeps the sheet open, showing the error.
    if (await handleAction('EXERCISE_SKIPPED')) setConfirmingSkip(false)
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
    return (
      <Skeleton className="p-6 space-y-4">
        <SkeletonBlock className="h-2 rounded-full" />
        <SkeletonHeading />
        <SkeletonBlock className="h-16 w-1/3 rounded-panel" />
        <SkeletonBlock className="h-64 rounded-panel" />
        <SkeletonBlock className="h-4 w-5/6 rounded-full" />
        <SkeletonBlock className="h-4 w-4/6 rounded-full" />
      </Skeleton>
    )
  }

  if (state.status === 'PAUSED') {
    const paused = plan.exercises[state.currentExerciseIndex]
    const pausedContent = paused ? exerciseById.get(paused.exerciseId) : undefined
    const timerWaiting = Boolean(state.restEndsAt || state.holdStartedAt)
    return (
      <div className="p-6 pt-10 pb-32 space-y-5">
        <div className="flex items-center gap-3">
          <RaeFace expression="smile" size={64} motion="pop" />
          <div>
            <p className="text-2xl font-bold">Take your time</p>
            <p className="text-sm text-ink-muted">{timerWaiting ? 'Paused. The timer waits for you.' : 'Paused.'}</p>
          </div>
        </div>
        {/* What's waiting: the move and set you'll pick back up, with Rae
            doing it (or its photo), so resuming needs no re-orienting. */}
        {paused && (
          <div className="card space-y-3 p-4 text-center">
            <ExerciseThumb
              exercise={pausedContent ?? { id: paused.exerciseId, mediaManifest: {} }}
              className="mx-auto h-[28vh] w-auto max-w-full rounded-panel"
            />
            <div>
              <p className="text-xl font-bold leading-tight">{paused.name}</p>
              <p className="text-sm font-semibold text-ink-muted">
                Set {state.currentSetNumber} of {paused.sets}
              </p>
            </div>
          </div>
        )}
        {error && <p className="text-sm text-accent">{error}</p>}
        <button type="button" className="btn-secondary min-h-11 w-full" disabled={busy} onClick={openEndSheet}>
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
        tick={feedback.sound}
        onRestComplete={() => {
          restEndFeedback(feedback)
          void handleAction('REST_ENDED')
        }}
        // Persisted like every other session action, so a refresh or
        // reopen mid-rest keeps the extended deadline.
        onExtend={() => handleAction('REST_EXTENDED', { byMs: REST_EXTENSION_MS })}
        onSkip={() => handleAction('REST_SKIPPED')}
        onPause={() => handleAction('PAUSED')}
        onUndo={state.lastSet ? () => handleAction('SET_UNDONE') : undefined}
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
  const progress = workoutProgress(plan, state.currentExerciseIndex, state.currentSetNumber)
  const exerciseLabel = `Exercise ${state.currentExerciseIndex + 1} of ${plan.exercises.length}`
  const timed = exercise.reps == null && exercise.timeSeconds != null
  const holding = timed && state.holdStartedAt !== null
  const target = exercise.reps != null ? { value: exercise.reps, unit: 'reps' } : exercise.timeSeconds != null ? { value: exercise.timeSeconds, unit: 'sec hold' } : null
  const nextExercise = plan.exercises[state.currentExerciseIndex + 1]
  const repTarget = exercise.reps ?? 0

  const skipSheet = confirmingSkip ? (
    <ConfirmSheet
      title={`Skip ${exercise.name}?`}
      confirmLabel="Skip"
      cancelLabel="Keep it"
      busy={busy}
      error={error}
      onConfirm={handleSkipMove}
      onCancel={() => setConfirmingSkip(false)}
    >
      {nextExercise ? `Its other sets stay undone. Next up: ${nextExercise.name}.` : 'This is the last move, so the workout ends here.'}
    </ConfirmSheet>
  ) : null

  return (
    <div className="p-6 pt-4 pb-40 space-y-4">
      {/* Rare actions live up here, out of the thumb bar: End workout used
          to sit exactly where the rest screen's "Skip rest" is (a double tap
          ended the session), and mid-set there's no timer to pause, so
          Pause only crowded Complete Set. */}
      <div className="space-y-2">
        {/* Above the bar's overlay button, so Pause/End keep their full area. */}
        <div className="relative z-10 flex items-center justify-between">
          {/* "1 of 5" opens the whole workout (view-only overview sheet). */}
          <button
            type="button"
            className="-ml-2 flex min-h-11 items-center gap-2 rounded-control px-2 active:bg-field-primary"
            aria-haspopup="dialog"
            aria-label={`${exerciseLabel}. See the whole workout`}
            onClick={() => setShowingOverview(true)}
          >
            <RaeFace expression="focused" size={36} motion="none" />
            <span className="text-sm font-semibold text-ink-muted">
              {state.currentExerciseIndex + 1} of {plan.exercises.length}
            </span>
            <span aria-hidden="true" className="text-xs text-ink-muted">
              ▾
            </span>
          </button>
          <div className="-mr-3 flex">
            <button className="btn-ghost min-h-11" disabled={busy} onClick={() => handleAction('PAUSED')}>
              Pause
            </button>
            <button className="btn-ghost min-h-11" disabled={busy} onClick={openEndSheet}>
              End workout
            </button>
          </div>
        </div>
        {/* The bar is a tap target too: an invisible 44px button laid over
            it, so the layout doesn't grow and the progressbar keeps its own
            reading for screen readers. */}
        <div className="relative">
          <WorkoutProgressBar done={progress.done} total={progress.total} label={exerciseLabel} />
          <button
            type="button"
            className="absolute inset-x-0 top-1/2 h-11 -translate-y-1/2"
            aria-haspopup="dialog"
            aria-label="See the whole workout"
            onClick={() => setShowingOverview(true)}
          />
        </div>
        {showingOverview && sessionId && (
          <WorkoutOverviewSheet
            sessionId={sessionId}
            plan={plan}
            state={state}
            exerciseById={exerciseById}
            onClose={() => setShowingOverview(false)}
          />
        )}
      </div>

      {/* The target, readable from the floor: a big number, what it counts,
          and one dot per set. The caption says the same thing as text. A
          running hold swaps the number for its countdown ring. */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold leading-tight">{exercise.name}</h2>
        {holding && state.holdStartedAt ? (
          <HoldCountdown
            key={state.holdStartedAt}
            holdStartedAt={state.holdStartedAt}
            timeSeconds={exercise.timeSeconds ?? 0}
            tick={feedback.sound}
            onDone={() => {
              restEndFeedback(feedback)
              void handleAction('SET_COMPLETED', { exerciseId: exercise.exerciseId })
            }}
          />
        ) : (
          <div className="flex items-end justify-between gap-4">
            <p className="flex items-baseline gap-2">
              {target && (
                <>
                  <span className="hud-num text-6xl font-extrabold leading-none text-primary">{target.value}</span>
                  <span className="text-lg font-bold text-ink-muted">{target.unit}</span>
                </>
              )}
              {weighted && <span className="hud-num text-lg font-bold">@ {formatWeight(setWeightKg, unit)}</span>}
            </p>
            <div className="flex-none space-y-1 pb-1">
              <SetDots total={exercise.sets} current={state.currentSetNumber} />
              <p className="text-sm font-semibold text-ink-muted">
                Set {state.currentSetNumber} of {exercise.sets}
              </p>
            </div>
          </div>
        )}
        {lastTime && !holding && <p className="text-sm text-ink-muted">{lastTime}</p>}
      </div>

      {exerciseContent && (
        <MovementMedia
          name={exerciseContent.name}
          exerciseId={exerciseContent.id}
          start={exerciseContent.mediaManifest.start}
          finish={exerciseContent.mediaManifest.finish}
        />
      )}

      {exerciseContent && (exerciseContent.setup || exerciseContent.executionPhases.length > 0) && (
        <StepsList
          key={exercise.exerciseId}
          steps={[exerciseContent.setup, ...exerciseContent.executionPhases].filter(Boolean)}
          folded={familiarIds.has(exercise.exerciseId) && !openedIds.has(exercise.exerciseId)}
          onUnfold={() => setOpenedIds((ids) => new Set(ids).add(exercise.exerciseId))}
        />
      )}

      {/* A sore wrist or no room for lunges shouldn't end the whole workout. */}
      {!awaitingRepCheck && (
        <button type="button" className="btn-ghost min-h-11 w-full" disabled={busy} onClick={() => setConfirmingSkip(true)}>
          Skip this move
        </button>
      )}

      {error && !confirmingSkip && <p className="text-sm text-accent">{error}</p>}
      {endSheet}
      {skipSheet}
      {awaitingRepCheck && weighted && shortReps === null && (
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

      {/* Screen readers hear the question the thumb bar is asking. */}
      <p className="sr-only" aria-live="polite">
        {shortReps !== null
          ? 'Rep count: enter how many you did'
          : awaitingRepCheck
            ? `Rep check: all ${repTarget} done?`
            : holding
              ? `Hold, ${exercise.timeSeconds} seconds`
              : undoNotice
                ? `Set undone. Set ${state.currentSetNumber} of ${exercise.sets} again.`
                : ''}
      </p>

      {/* Complete Set is the most-tapped control in the app — pinned to a
          fixed bottom bar so it's always in thumb reach regardless of how
          much media/instruction content is above it. */}
      <ThumbBar
        armKey={`${state.currentExerciseIndex}:${state.currentSetNumber}:${awaitingRepCheck}:${shortReps !== null}:${repsOther}:${holding}`}
        className="space-y-2"
      >
        {shortReps !== null && !repsOther ? (
          <>
            <RepQuestion busy={busy} onUndo={cancelRepCheck}>How many reps?</RepQuestion>
            <RepPicks
              target={repTarget}
              busy={busy}
              onOther={() => setRepsOther(true)}
              onPick={(reps) =>
                handleAction('SET_COMPLETED', {
                  exerciseId: exercise.exerciseId,
                  met: false,
                  reps,
                  ...(weighted ? { weightKg: setWeightKg } : {}),
                })
              }
            />
          </>
        ) : shortReps !== null ? (
          <>
            <RepQuestion busy={busy} onUndo={cancelRepCheck}>How many reps?</RepQuestion>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="stepper-btn"
                aria-label="Fewer reps"
                disabled={busy || shortReps <= 0}
                onClick={() => setShortReps(Math.max(0, shortReps - 1))}
              >
                −
              </button>
              <span className="hud-num w-12 text-center text-3xl font-extrabold tabular-nums">{shortReps}</span>
              <button
                type="button"
                className="stepper-btn"
                aria-label="More reps"
                disabled={busy || shortReps >= repTarget - 1}
                onClick={() => setShortReps(Math.min(repTarget - 1, shortReps + 1))}
              >
                +
              </button>
              <button
                className="btn-primary flex-1"
                disabled={busy}
                onClick={() =>
                  handleAction('SET_COMPLETED', {
                    exerciseId: exercise.exerciseId,
                    met: false,
                    reps: shortReps,
                    ...(weighted ? { weightKg: setWeightKg } : {}),
                  })
                }
              >
                Save reps
              </button>
            </div>
          </>
        ) : awaitingRepCheck ? (
          <>
            <RepQuestion busy={busy} onUndo={cancelRepCheck}>Did you complete all {exercise.reps} reps?</RepQuestion>
            <div className="flex gap-2">
              <button className="btn-secondary flex-1" disabled={busy} onClick={() => setShortReps(Math.max(0, repTarget - 1))}>
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
        ) : timed && !holding ? (
          // A timed set counts itself down; Complete Set stays for anyone
          // timing it on their own.
          <div className="flex gap-2">
            <button
              className="btn-secondary"
              disabled={busy}
              onClick={() => handleCompleteSetClick(exercise.exerciseId, false)}
            >
              Complete Set
            </button>
            <button className="btn-primary btn-lg flex-1" disabled={busy} onClick={handleStartHold}>
              Start {exercise.timeSeconds}s
            </button>
          </div>
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

// A familiar move (FAMILIAR_AFTER_SESSIONS) folds its steps behind one tap,
// so the screen is Rae and the reps; the steps are never removed.
function StepsList({ steps, folded, onUnfold }: { steps: string[]; folded: boolean; onUnfold: () => void }) {
  const [expanded, setExpanded] = useState(false)
  if (folded) {
    return (
      <button type="button" className="btn-ghost min-h-11 w-full" onClick={onUnfold}>
        Show steps
      </button>
    )
  }
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
        <button type="button" className="min-h-11 text-sm text-primary-ink" onClick={() => setExpanded(true)}>
          Show {hidden} more {hidden === 1 ? 'step' : 'steps'}
        </button>
      )}
    </div>
  )
}

// Sets finished across the whole plan: every set of the exercises before
// the current one, plus the current exercise's sets before this one.
function workoutProgress(plan: SessionPlan, exerciseIndex: number, setNumber: number): { done: number; total: number } {
  const total = plan.exercises.reduce((sum, e) => sum + e.sets, 0)
  const before = plan.exercises.slice(0, exerciseIndex).reduce((sum, e) => sum + e.sets, 0)
  return { done: Math.min(total, before + setNumber - 1), total }
}

// A running hold: its countdown in a ring, from the persisted start time
// (HOLD_STARTED), so a refresh keeps the clock. At zero the set completes.
function HoldCountdown({
  holdStartedAt,
  timeSeconds,
  tick,
  onDone,
}: {
  holdStartedAt: string
  timeSeconds: number
  tick: boolean
  onDone: () => void
}) {
  const endsAt = new Date(Date.parse(holdStartedAt) + timeSeconds * 1000).toISOString()
  // Fires once: a refresh after the hold ran out completes it straight away.
  const doneRef = useRef(false)
  const seconds = useCountdown(
    endsAt,
    () => {
      if (doneRef.current) return
      doneRef.current = true
      onDone()
    },
    tick
  )
  return (
    <RestRing restStartedAt={holdStartedAt} restEndsAt={endsAt} seconds={seconds} size={168}>
      <p className="text-sm font-bold text-ink-muted">Hold</p>
      <p className="hud-num text-5xl font-extrabold leading-none tabular-nums text-primary" role="timer">
        {seconds}
      </p>
      <p className="text-xs font-semibold text-ink-muted">sec</p>
    </RestRing>
  )
}

// The rep check's question with a way back: a mis-tapped Complete Set is
// taken back here before anything is saved.
function RepQuestion({ children, busy, onUndo }: { children: React.ReactNode; busy: boolean; onUndo: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-xl font-bold">{children}</p>
      <button type="button" className="btn-ghost min-h-11 flex-none" disabled={busy} aria-label="Undo, back to the set" onClick={onUndo}>
        Undo
      </button>
    </div>
  )
}

function RestingView({
  upNext,
  upNextContent,
  setNumber,
  restStartedAt,
  restEndsAt,
  busy,
  error,
  tick,
  onRestComplete,
  onExtend,
  onSkip,
  onPause,
  onUndo,
}: {
  // During rest the session already points at the coming set.
  upNext: SessionPlanExercise | undefined
  upNextContent: Exercise | undefined
  setNumber: number
  restStartedAt: string | null
  restEndsAt: string
  busy: boolean
  error: string | null
  tick: boolean
  onRestComplete: () => void
  onExtend: () => void
  onSkip: () => void
  onPause: () => void
  // Takes back the set that started this rest; absent when there's nothing
  // to undo (e.g. the rest came back from a session with no set to revert).
  onUndo?: () => void
}) {
  // The timer derives from the persisted restEndsAt alone (+15s moves that
  // timestamp via REST_EXTENDED; a pause pushes it on resume), so a refresh
  // mid-rest shows the same countdown.
  const seconds = useCountdown(restEndsAt, onRestComplete, tick)
  // Announced once as the rest starts and once near its end, not every second.
  const [spoken, setSpoken] = useState(() => `Rest, ${seconds} seconds`)
  useEffect(() => {
    if (seconds === 10) setSpoken('10 seconds left')
  }, [seconds])

  return (
    <div className="field-calm min-h-screen rounded-none p-6 pt-4 pb-32 text-center space-y-4">
      <div className="flex items-center justify-between">
        <RaeFace expression="tired" size={48} />
        <button className="btn-ghost min-h-11 -mr-3" disabled={busy} onClick={onPause}>
          Pause
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {spoken}
      </p>
      <RestRing restStartedAt={restStartedAt} restEndsAt={restEndsAt} seconds={seconds}>
        <p className="text-lg font-bold">Rest</p>
        <p className="hud-num text-6xl font-extrabold leading-none tabular-nums" role="timer">
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
        </p>
      </RestRing>
      {/* A mis-tapped Complete Set is taken back here, away from the
          thumb bar so it can't be hit by the tap that lands on Skip rest. */}
      {onUndo && (
        <button type="button" className="btn-ghost min-h-11" disabled={busy} onClick={onUndo}>
          ↶ Undo last set
        </button>
      )}
      {upNext && (
        <UpNext
          exerciseId={upNext.exerciseId}
          name={upNext.name}
          content={upNextContent}
          setNumber={setNumber}
          sets={upNext.sets}
        />
      )}
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

// Rest previews what's coming, as a card under the timer: Rae's loop for
// the next move (the exercise's photo when Rae doesn't demonstrate it
// yet), its name, and which set it will be.
function UpNext({
  exerciseId,
  name,
  content,
  setNumber,
  sets,
}: {
  exerciseId: string
  name: string
  content: Exercise | undefined
  setNumber: number
  sets: number
}) {
  const { motion } = useTheme()
  const osPrefersReduced = usePrefersReducedMotion()
  const loop = raeLoopForExercise(exerciseId)
  return (
    <div className="card space-y-2 p-3">
      <p className="text-sm font-bold text-ink-muted">Up next</p>
      {loop && (
        <RaeExerciseLoop
          id={loop.id}
          name={name.toLowerCase()}
          width={loop.width}
          height={loop.height}
          stills={loop.stills}
          animate={effectiveMotion(motion, osPrefersReduced) === 'full'}
          imgClassName="max-h-[24vh] w-auto"
        />
      )}
      {!loop && content?.mediaManifest.start && (
        <ExerciseThumb exercise={content} className="mx-auto h-[24vh] w-auto max-w-full rounded-panel" />
      )}
      <div>
        <p className="text-lg font-bold leading-tight">{name}</p>
        <p className="text-sm font-semibold text-ink-muted">
          Set {setNumber} of {sets}
        </p>
      </div>
    </div>
  )
}
