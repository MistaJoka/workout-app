import { useEffect, useState } from 'react'
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
import { RaeFace, type RaeExpression } from '../components/Rae'
import { useWeightUnit } from '../components/useWeightUnit'
import { formatWeight } from '../units'

const TIME_CHOICES = [10, 15, 20, 30, 45, 60]

function feelingFace(energy: number, comfort: number): RaeExpression {
  const mood = (energy + comfort) / 2
  if (mood <= 2) return 'smile'
  if (mood < 3.5) return 'happy'
  if (mood < 4.5) return 'determined'
  return 'cheer'
}

type Loaded = {
  template: WorkoutTemplate
  exercises: Exercise[]
  repsOverridesByExerciseId: Map<string, number>
  weightOverridesByExerciseId: Map<string, number>
}

function buildPlan(loaded: Loaded, checkIn: { energy: number; comfort: number; availableMinutes: number }): SessionPlan {
  return createSessionPlanFromTemplate({
    id: newId(),
    createdAt: new Date().toISOString(),
    template: loaded.template,
    exercises: loaded.exercises,
    checkIn,
    ruleVersion: 'foundation-strength-starter-v1',
    repsOverridesByExerciseId: loaded.repsOverridesByExerciseId,
    weightOverridesByExerciseId: loaded.weightOverridesByExerciseId,
  })
}

// Check-in and preview on one screen: how you feel, what you're about to
// do, one Start button. (They used to be two screens with "Continue" and
// "Start Workout" in the same spot — an extra tap, and a double tap on
// Continue skipped the preview anyway.)
export function CheckInScreen() {
  const { templateId } = useParams()
  const navigate = useNavigate()
  const [unit] = useWeightUnit()
  const [loaded, setLoaded] = useState<Loaded | null | undefined>(undefined)
  const [energy, setEnergy] = useState(3)
  const [comfort, setComfort] = useState(3)
  const [availableMinutes, setAvailableMinutes] = useState(30)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!templateId) return
    let cancelled = false
    async function load(id: string) {
      const template = await getTemplate(id)
      if (!template) {
        if (!cancelled) setLoaded(null)
        return
      }
      const ids = template.exercises.map((e) => e.exerciseId)
      const [exercises, progressionRecords] = await Promise.all([getExercises(ids), Promise.all(ids.map(getProgression))])
      if (cancelled) return
      setLoaded({
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
      })
    }
    void load(templateId)
    return () => {
      cancelled = true
    }
  }, [templateId])

  if (loaded === undefined) return <div className="p-4">Loading…</div>
  if (loaded === null) {
    return (
      <div className="p-4 space-y-2">
        <p>That workout isn't available.</p>
        <button className="underline" onClick={() => navigate('/')}>
          Back to Today
        </button>
      </div>
    )
  }

  // Check-in answers are recorded on the plan but don't change the
  // prescription, so the list below is what Start will actually run.
  const preview = buildPlan(loaded, { energy, comfort, availableMinutes })

  async function handleStart() {
    if (!loaded) return
    setStarting(true)
    setError(null)
    // A fresh id/timestamp at the moment of starting: this is the
    // immutable SessionPlan snapshot.
    const plan = buildPlan(loaded, { energy, comfort, availableMinutes })
    try {
      await startSession(plan)
      navigate(`/session/${plan.id}`, { replace: true })
    } catch {
      setError('Could not start the workout. Try again.')
      setStarting(false)
    }
  }

  return (
    <div className="p-4 pb-28 space-y-5">
      <div>
        <BackButton />
        <h1 className="text-2xl font-bold">{loaded.template.name}</h1>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">How are you feeling?</h2>
          {/* Rae mirrors the answers back, never judging a low day: the
              lowest she goes is a gentle smile. Keyed so each change pops. */}
          <RaeFace key={feelingFace(energy, comfort)} expression={feelingFace(energy, comfort)} size={56} motion="pop" />
        </div>
        <ScaleField label="Energy" value={energy} onChange={setEnergy} low="Low" high="High" />
        <ScaleField label="Comfort" value={comfort} onChange={setComfort} low="Sore" high="Great" />
        <ChoiceField
          label="Minutes available"
          value={availableMinutes}
          choices={TIME_CHOICES}
          onChange={setAvailableMinutes}
          format={String}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">Your workout</h2>
        <ul className="space-y-2">
          {preview.exercises.map((exercise) => (
            <li key={exercise.exerciseId} className="card flex items-center gap-3 p-2">
              <ExerciseThumb
                exercise={loaded.exercises.find((e) => e.id === exercise.exerciseId)}
                className="h-12 w-16 rounded-panel"
              />
              <div className="min-w-0">
                <p className="truncate font-semibold">{exercise.name}</p>
                <p className="text-sm text-ink-muted">
                  {exercise.sets} sets × {exercise.reps ? `${exercise.reps} reps` : `${exercise.timeSeconds}s`}
                  {exercise.weightKg != null ? ` @ ${formatWeight(exercise.weightKg, unit)}` : ''}, rest {exercise.restSeconds}s
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {error && <p className="text-sm text-accent">{error}</p>}
      <ThumbBar armKey="checkin">
        <button className="btn-primary btn-lg w-full" disabled={starting} onClick={handleStart}>
          Start workout
        </button>
      </ThumbBar>
    </div>
  )
}

// One tap per answer: a row of 1–5, low/high words under the ends.
function ScaleField({
  label,
  value,
  onChange,
  low,
  high,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  low: string
  high: string
}) {
  return (
    <div className="space-y-1">
      <ChoiceField label={label} value={value} choices={[1, 2, 3, 4, 5]} onChange={onChange} format={String} />
      <span className="flex justify-between text-xs text-ink-muted">
        <span>{low}</span>
        <span>{high}</span>
      </span>
    </div>
  )
}

function ChoiceField({
  label,
  value,
  choices,
  onChange,
  format,
}: {
  label: string
  value: number
  choices: number[]
  onChange: (value: number) => void
  format: (value: number) => string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="space-y-1">
      <p className="text-sm font-semibold">{label}</p>
      <div className="flex gap-2">
        {choices.map((choice) => (
          <button
            key={choice}
            type="button"
            role="radio"
            aria-checked={choice === value}
            className={`chip flex-1 justify-center px-0 ${choice === value ? 'chip-active' : ''}`}
            onClick={() => onChange(choice)}
          >
            {format(choice)}
          </button>
        ))}
      </div>
    </div>
  )
}
