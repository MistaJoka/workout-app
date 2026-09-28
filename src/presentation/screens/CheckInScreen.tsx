import { useEffect, useMemo, useState } from 'react'
import { newId } from '../../shared/id'
import { useNavigate, useParams } from 'react-router-dom'
import { startSession } from '../../application/sessionService'
import { getExercises, getTemplate } from '../../domain/content/catalog'
import type { Exercise, WorkoutTemplate } from '../../domain/content/types'
import { createSessionPlanFromTemplate } from '../../domain/session/createSessionPlan'
import type { SessionPlan } from '../../domain/session/types'
import { getProgression } from '../../infrastructure/db/repositories/familiarityProgressionRepository'
import { BackButton } from '../components/BackButton'
import { ThumbBar } from '../components/ThumbBar'
import { ExerciseThumb } from '../components/ExerciseThumb'
import { RaeFace } from '../components/Rae'
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
  if (loaded === undefined) return <div className="p-4">Loading…</div>
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

  async function handleStart() {
    if (!loaded) return
    setStarting(true)
    setError(null)
    // A fresh id/timestamp at the moment of starting: this is the
    // immutable SessionPlan snapshot.
    const plan = buildPlan(loaded)
    try {
      await startSession(plan)
      navigate(`/session/${plan.id}`, { replace: true })
    } catch {
      setError("Couldn't start on this device. Try again.")
      setStarting(false)
    }
  }

  return (
    <div className="p-4 pb-28 space-y-5">
      <div>
        <BackButton />
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">{loaded.template.name}</h1>
            <p className="text-ink-muted">
              {preview.exercises.length} moves, {totalSets} sets
            </p>
          </div>
          <RaeFace expression="happy" size={56} motion="pop" />
        </div>
      </div>

      <ul className="space-y-2" aria-label="Your workout">
        {preview.exercises.map((exercise) => (
          <li key={exercise.exerciseId} className="card flex items-center gap-3 p-2">
            <ExerciseThumb
              exercise={loaded.exercises.find((e) => e.id === exercise.exerciseId)}
              className="h-12 w-16 rounded-panel"
            />
            <div className="min-w-0">
              <p className="truncate font-semibold">{exercise.name}</p>
              <p className="text-sm text-ink-muted">
                {exercise.sets} × {exercise.reps ? `${exercise.reps} reps` : `${exercise.timeSeconds}s`}
                {exercise.weightKg != null ? ` @ ${formatWeight(exercise.weightKg, unit)}` : ''}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {error && <p className="text-sm text-accent">{error}</p>}
      <ThumbBar armKey="checkin">
        <button className="btn-primary btn-lg w-full" disabled={starting} onClick={handleStart}>
          Start workout
        </button>
      </ThumbBar>
    </div>
  )
}
