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
import { BackButton } from '../components/BackButton'
import { ThumbBar } from '../components/ThumbBar'
import { Skeleton, SkeletonBlock, SkeletonHeading, SkeletonList } from '../components/Skeleton'
import { ExerciseThumb } from '../components/ExerciseThumb'
import { MovementMedia } from '../components/MovementMedia'
import { bookendsFor, estimateMinutes } from '../../domain/content/workoutEstimate'
import { templateById } from '../../domain/content/fixtures/foundationStrengthStarter'
import { useWeightUnit } from '../components/useWeightUnit'
import { formatWeight } from '../units'

type Loaded = {
  template: WorkoutTemplate
  exercises: Exercise[]
  repsOverridesByExerciseId: Map<string, number>
  weightOverridesByExerciseId: Map<string, number>
}

// No check-in is asked: no adaptation rule reads one yet (the placeholder
// rules retain every exercise), so energy/comfort/minutes changed nothing
// and cost three taps (owner, 2026-09-28: "one-tap Start"). The plan says
// which rules made it via ruleVersion's default.
function buildPlan(loaded: Loaded): SessionPlan {
  return createSessionPlanFromTemplate({
    id: newId(),
    createdAt: new Date().toISOString(),
    template: loaded.template,
    exercises: loaded.exercises,
    repsOverridesByExerciseId: loaded.repsOverridesByExerciseId,
    weightOverridesByExerciseId: loaded.weightOverridesByExerciseId,
  })
}

async function loadWorkout(id: string): Promise<Loaded | null> {
  const template = await getTemplate(id)
  if (!template) return null
  const ids = template.exercises.map((e) => e.exerciseId)
  const [exercises, progressionRecords] = await Promise.all([getExercises(ids), Promise.all(ids.map(getProgression))])
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
  const preview = useMemo(() => (loaded ? buildPlan(loaded) : null), [loaded])

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
  const minutes = estimateMinutes(loaded.template)
  const first = preview.exercises[0]
  const firstContent = first ? loaded.exercises.find((e) => e.id === first.exerciseId) : undefined
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
    const plan = buildPlan(loaded)
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
        {preview.exercises.map((exercise) => (
          <li key={exercise.exerciseId}>
            <Link to={`/exercise/${exercise.exerciseId}`} className="card flex min-h-11 items-center gap-3 p-2">
              <ExerciseThumb
                exercise={loaded.exercises.find((e) => e.id === exercise.exerciseId)}
                className="h-12 w-16 rounded-panel"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{exercise.name}</span>
                <span className="block text-sm text-ink-muted">
                  {exercise.sets} × {exercise.reps ? `${exercise.reps} reps` : `${exercise.timeSeconds}s`}
                  {exercise.weightKg != null ? ` @ ${formatWeight(exercise.weightKg, unit)}` : ''}
                </span>
              </span>
              <span aria-hidden="true" className="flex-none pr-1 text-ink-muted">
                ›
              </span>
            </Link>
          </li>
        ))}
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
