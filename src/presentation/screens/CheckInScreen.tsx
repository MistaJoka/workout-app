import { useEffect, useMemo, useState } from 'react'
import { newId } from '../../shared/id'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { startSession } from '../../application/sessionService'
import { primeAudio } from '../../application/restFeedback'
import { playCelebration } from '../../application/celebrationSounds'
import { useFeedbackSettings } from '../components/useFeedbackSettings'
import { getExercises, getTemplate } from '../../domain/content/catalog'
import type { Exercise, WorkoutTemplate } from '../../domain/content/types'
import { createSessionPlanFromTemplate } from '../../domain/session/createSessionPlan'
import type { SessionPlan } from '../../domain/session/types'
import { getProgression } from '../../infrastructure/db/repositories/familiarityProgressionRepository'
import { getWeeklySchedule } from '../../infrastructure/db/repositories/scheduleRepository'
import { weeklyGoal } from '../../domain/progress/stats'
import { BackButton } from '../components/BackButton'
import { ThumbBar } from '../components/ThumbBar'
import { LengthDial } from '../components/LengthDial'
import { scaleTemplate, type WorkoutLength } from '../../domain/session/lengthDial'
import { Skeleton, SkeletonBlock, SkeletonHeading, SkeletonList } from '../components/Skeleton'
import { ExerciseThumb } from '../components/ExerciseThumb'
import { MovementMedia } from '../components/MovementMedia'
import { bookendsFor, estimateMinutes } from '../../domain/content/workoutEstimate'
import { templateById } from '../../domain/content/fixtures/foundationStrengthStarter'
import { useWeightUnit } from '../components/useWeightUnit'
import { formatWeight } from '../units'
import { SwapPicker } from '../components/SwapPicker'

type Loaded = {
  template: WorkoutTemplate
  exercises: Exercise[]
  repsOverridesByExerciseId: Map<string, number>
  weightOverridesByExerciseId: Map<string, number>
  weeklyGoal: number
}

// No check-in is asked: no adaptation rule reads one yet (the placeholder
// rules retain every exercise), so energy/comfort/minutes changed nothing
// and cost three taps (owner, 2026-09-28: "one-tap Start"). The plan says
// which rules made it via ruleVersion's default.
// Swapped-in moves (by slot order) and their own confirmed progression, so
// a move she has levelled up elsewhere keeps its reps here too.
type Swaps = { bySlot: Map<number, Exercise>; reps: Map<string, number>; weight: Map<string, number> }
const NO_SWAPS: Swaps = { bySlot: new Map(), reps: new Map(), weight: new Map() }

function buildPlan(loaded: Loaded, length: WorkoutLength, swaps: Swaps = NO_SWAPS): SessionPlan {
  return createSessionPlanFromTemplate({
    id: newId(),
    createdAt: new Date().toISOString(),
    template: loaded.template,
    exercises: [...loaded.exercises, ...swaps.bySlot.values()],
    repsOverridesByExerciseId: new Map([...loaded.repsOverridesByExerciseId, ...swaps.reps]),
    weightOverridesByExerciseId: new Map([...loaded.weightOverridesByExerciseId, ...swaps.weight]),
    weeklyGoal: loaded.weeklyGoal,
    length,
    ...(swaps.bySlot.size > 0 ? { swaps: swaps.bySlot } : {}),
  })
}

async function loadWorkout(id: string): Promise<Loaded | null> {
  const template = await getTemplate(id)
  if (!template) return null
  const ids = template.exercises.map((e) => e.exerciseId)
  const [exercises, progressionRecords, schedule] = await Promise.all([
    getExercises(ids),
    Promise.all(ids.map(getProgression)),
    getWeeklySchedule(),
  ])
  return {
    template,
    exercises: [...exercises.values()],
    repsOverridesByExerciseId: new Map(
      progressionRecords
        .filter((r) => r.currentPrescribedReps != null)
        .map((r) => [r.exerciseId, r.currentPrescribedReps as number])
    ),
    weightOverridesByExerciseId: new Map(
      progressionRecords.filter((r) => r.currentWeightKg != null).map((r) => [r.exerciseId, r.currentWeightKg as number])
    ),
    weeklyGoal: weeklyGoal(schedule),
  }
}

// The start screen (route /checkin/:templateId, kept for links): what
// you're about to do, and one Start.
export function CheckInScreen() {
  const { templateId } = useParams()
  const navigate = useNavigate()
  const [unit] = useWeightUnit()
  const [feedback] = useFeedbackSettings()
  const [loaded, setLoaded] = useState<Loaded | null | undefined>(undefined)
  const [loadFailed, setLoadFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Short / Usual / Long (lengthDial.ts): starts on Usual on every visit.
  const [length, setLength] = useState<WorkoutLength>('usual')
  // Swaps last for this visit only, like the length dial.
  const [swaps, setSwaps] = useState<Swaps>(NO_SWAPS)
  const [swapSlot, setSwapSlot] = useState<number | null>(null)

  useEffect(() => {
    if (!templateId) return
    let cancelled = false
    setLoadFailed(false)
    loadWorkout(templateId)
      .then((result) => {
        if (!cancelled) setLoaded(result)
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [templateId, attempt])

  // The list shows exactly what Start will run: same inputs, and the plan
  // built at Start differs only in its fresh id and timestamp.
  const preview = useMemo(() => (loaded ? buildPlan(loaded, length, swaps) : null), [loaded, length, swaps])
  const inWorkout = useMemo(() => {
    if (!loaded || !preview) return []
    const known = new Map([...loaded.exercises, ...swaps.bySlot.values()].map((e) => [e.id, e]))
    return preview.exercises.flatMap((e) => known.get(e.exerciseId) ?? [])
  }, [loaded, preview, swaps])

  if (loadFailed) {
    return (
      <div className="p-4 space-y-3">
        <BackButton />
        <p>Couldn't load this workout.</p>
        <button className="btn-secondary" onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </button>
      </div>
    )
  }
  if (loaded === undefined) {
    return (
      <Skeleton className="p-4 space-y-4">
        <SkeletonHeading />
        <SkeletonBlock className="h-48 rounded-panel" />
        <SkeletonList rows={4} thumb />
      </Skeleton>
    )
  }
  if (loaded === null || !preview) {
    return (
      <div className="p-4 space-y-2">
        <p>That workout isn't available.</p>
        <button className="underline" onClick={() => navigate('/')}>
          Back to Today
        </button>
      </div>
    )
  }

  const totalSets = preview.exercises.reduce((sum, e) => sum + e.sets, 0)
  const slot = swapSlot != null ? loaded.template.exercises.find((e) => e.order === swapSlot) : undefined
  if (slot) {
    const original = loaded.exercises.find((e) => e.id === slot.exerciseId)
    const current = preview.exercises.find((e) => e.order === slot.order)
    const close = () => setSwapSlot(null)
    const setSlot = (next: Exercise | null, reps?: number | null, weight?: number | null) =>
      setSwaps((prev) => {
        const bySlot = new Map(prev.bySlot)
        const repsMap = new Map(prev.reps)
        const weightMap = new Map(prev.weight)
        if (next) {
          bySlot.set(slot.order, next)
          if (reps != null) repsMap.set(next.id, reps)
          if (weight != null) weightMap.set(next.id, weight)
        } else bySlot.delete(slot.order)
        return { bySlot, reps: repsMap, weight: weightMap }
      })
    return (
      <SwapPicker
        slotName={current?.name ?? original?.name ?? 'move'}
        original={original}
        originalName={original?.name ?? 'the original'}
        isSwapped={swaps.bySlot.has(slot.order)}
        inWorkout={inWorkout}
        onPick={(exercise) => {
          // Its own progression, if any; a failed read just means defaults.
          void getProgression(exercise.id)
            .catch(() => null)
            .then((record) => {
              setSlot(exercise, record?.currentPrescribedReps, record?.currentWeightKg)
              close()
            })
        }}
        onRestore={() => {
          setSlot(null)
          close()
        }}
        onClose={close}
      />
    )
  }

  const minutesFor: Record<WorkoutLength, number> = {
    short: estimateMinutes(scaleTemplate(loaded.template, 'short')),
    usual: estimateMinutes(loaded.template),
    long: estimateMinutes(scaleTemplate(loaded.template, 'long')),
  }
  const minutes = minutesFor[length]
  const first = preview.exercises[0]
  const firstContent = first
    ? [...loaded.exercises, ...swaps.bySlot.values()].find((e) => e.id === first.exerciseId)
    : undefined
  const { warmUp } = bookendsFor(loaded.template.id, (id) => templateById.get(id))

  async function handleStart() {
    if (!loaded) return
    // User gesture: unlock audio (iOS) and give a gentle whoosh-up before
    // the player loads.
    if (feedback.sound) primeAudio()
    playCelebration('start', feedback)
    setStarting(true)
    setError(null)
    // A fresh id/timestamp at the moment of starting: this is the
    // immutable SessionPlan snapshot.
    const plan = buildPlan(loaded, length, swaps)
    try {
      await startSession(plan)
      // The hype overlay (WorkoutPlayerScreen) only runs right after a tap
      // here, never on a resumed/reloaded session — this flag is its first
      // signal; the player corroborates it against the fresh plan itself.
      navigate(`/session/${plan.id}`, { replace: true, state: { justStarted: true } })
    } catch {
      setError("Couldn't start on this device. Try again.")
      setStarting(false)
    }
  }

  return (
    <div className="p-4 pb-28 space-y-5">
      <div>
        <BackButton />
        <h1 className="text-2xl font-bold">{loaded.template.name}</h1>
        <p className="text-ink-muted">
          {preview.exercises.length} moves, {totalSets} sets, about {minutes} min
        </p>
      </div>

      <LengthDial value={length} minutes={minutesFor} onChange={setLength} />

      {warmUp && (
        <Link
          to={`/checkin/${warmUp.id}`}
          className="card flex min-h-11 items-center justify-between gap-3 px-4 py-3"
        >
          <span className="min-w-0">
            <span className="block font-semibold">Warm up first</span>
            <span className="block text-sm text-ink-muted">
              {warmUp.exercises.length} moves, about {estimateMinutes(warmUp)} min
            </span>
          </span>
          <span aria-hidden="true" className="text-ink-muted">
            ›
          </span>
        </Link>
      )}

      {/* Up first: Rae doing the opening move, so the screen shows what
          Start leads into (photo when Rae doesn't demo it yet). */}
      {firstContent && (
        <section aria-label={`Up first: ${firstContent.name}`} className="space-y-1">
          <p className="text-sm font-semibold text-ink-muted">Up first</p>
          {/* Tap to see the move's steps before starting. */}
          <Link to={`/exercise/${firstContent.id}`} aria-label={`About ${firstContent.name}`} className="block">
            <MovementMedia
              name={firstContent.name}
              exerciseId={firstContent.id}
              start={firstContent.mediaManifest.start}
              finish={firstContent.mediaManifest.finish}
            />
          </Link>
        </section>
      )}

      <ul className="space-y-2" aria-label="Your workout">
        {preview.exercises.map((exercise) => {
          const swapped = swaps.bySlot.get(exercise.order)
          const content = swapped ?? loaded.exercises.find((e) => e.id === exercise.exerciseId)
          return (
            <li key={exercise.order} className="card flex min-h-11 items-center gap-1 p-2">
              <Link to={`/exercise/${exercise.exerciseId}`} className="flex min-w-0 flex-1 items-center gap-3">
                <ExerciseThumb exercise={content} className="h-12 w-16 rounded-panel" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{exercise.name}</span>
                  <span className="block text-sm text-ink-muted">
                    {exercise.sets} × {exercise.reps ? `${exercise.reps} reps` : `${exercise.timeSeconds}s`}
                    {exercise.weightKg != null ? ` @ ${formatWeight(exercise.weightKg, unit)}` : ''}
                  </span>
                </span>
              </Link>
              {/* Swap this move for today only (domain/session/swaps.ts). */}
              <button
                type="button"
                className={`flex h-11 w-11 flex-none items-center justify-center rounded-full text-lg ${
                  swapped ? 'bg-field-primary text-primary-ink' : 'text-ink-muted'
                }`}
                aria-label={swapped ? `${exercise.name}, swapped in. Change` : `Swap ${exercise.name}`}
                onClick={() => setSwapSlot(exercise.order)}
              >
                <span aria-hidden="true">⇄</span>
              </button>
            </li>
          )
        })}
      </ul>

      {/* Safety at the point of risk, not just once on first run (see
          OnboardingGate): this is the moment someone is about to move. */}
      <p className="text-xs text-ink-muted">
        Stop any movement that causes pain.{' '}
        <Link to="/about" className="underline">
          More
        </Link>
      </p>

      {error && <p className="text-sm text-accent">{error}</p>}
      <ThumbBar armKey="checkin">
        <button className="btn-primary btn-lg w-full" disabled={starting} onClick={handleStart}>
          Start workout
        </button>
      </ThumbBar>
    </div>
  )
}
