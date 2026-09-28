import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { getExercises, getTemplate } from '../../domain/content/catalog'
import type { Exercise, WorkoutTemplate } from '../../domain/content/types'
import { deleteCustomTemplate, isCustomTemplateId } from '../../infrastructure/db/repositories/customTemplateRepository'
import { formatWeight } from '../units'
import { useWeightUnit } from '../components/useWeightUnit'
import { BackButton } from '../components/BackButton'
import { ExerciseThumb } from '../components/ExerciseThumb'
import { ThumbBar } from '../components/ThumbBar'

export function RoutineDetailScreen() {
  const { templateId } = useParams()
  const navigate = useNavigate()
  // Set by "Add to a routine" on an exercise page.
  const added = (useLocation().state as { added?: string } | null)?.added
  const [unit] = useWeightUnit()
  const [template, setTemplate] = useState<WorkoutTemplate | null | undefined>(undefined)
  const [exercises, setExercises] = useState<Map<string, Exercise>>(new Map())
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!templateId) return
    let cancelled = false
    setLoadFailed(false)
    getTemplate(templateId)
      .then(async (t) => {
        if (cancelled) return
        setTemplate(t ?? null)
        // Names and thumbnails only; the routine still starts without them.
        if (t) {
          const loaded = await getExercises(t.exercises.map((e) => e.exerciseId)).catch(() => null)
          if (!cancelled && loaded) setExercises(loaded)
        }
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [templateId, attempt])

  if (loadFailed) {
    return (
      <div className="p-4 space-y-4">
        <BackButton />
        <p className="font-bold">Couldn't load this routine.</p>
        <button type="button" className="btn-primary w-full" onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </button>
      </div>
    )
  }
  if (template === undefined) return <div className="p-4">Loading…</div>
  if (template === null) {
    return (
      <div className="p-4 space-y-2">
        <p>That routine isn't available.</p>
        <button className="underline" onClick={() => navigate('/library')}>
          Back to Library
        </button>
      </div>
    )
  }

  const custom = isCustomTemplateId(template.id)

  async function handleDelete() {
    if (!template) return
    setDeleting(true)
    setError(null)
    try {
      await deleteCustomTemplate(template.id)
      navigate('/library', { replace: true })
    } catch {
      setError("Couldn't delete on this device. Try again.")
      setDeleting(false)
    }
  }

  return (
    <div className="p-4 space-y-4 pb-44">
      <BackButton />
      <h1 className="text-2xl font-bold">{template.name}</h1>
      {added && (
        <p className="field-success px-3 py-2 text-sm font-semibold" role="status">
          Added {added}
        </p>
      )}

      <ul className="space-y-2">
        {template.exercises.map((te) => {
          const exercise = exercises.get(te.exerciseId)
          const dose =
            (te.prescription.reps
              ? `${te.prescription.sets} × ${te.prescription.reps}`
              : `${te.prescription.sets} × ${te.prescription.timeSeconds}s`) +
            (te.prescription.weightKg != null ? ` @ ${formatWeight(te.prescription.weightKg, unit)}` : '')
          return (
            <li key={te.exerciseId}>
              <Link
                to={`/exercise/${te.exerciseId}`}
                className="flex items-center gap-3 card p-2"
              >
                <ExerciseThumb exercise={exercise} className="h-12 w-16 rounded-panel" />
                <span className="min-w-0 flex-1 truncate font-semibold">{exercise?.name ?? te.exerciseId}</span>
                <span className="flex-none text-sm text-ink-muted">{dose}</span>
              </Link>
            </li>
          )
        })}
      </ul>

      {custom && (
        <div className="flex gap-2">
          <Link to={`/routines/${template.id}/edit`} className="btn-secondary flex-1">
            Edit
          </Link>
          {confirmingDelete ? (
            <button className="btn-danger flex-1" disabled={deleting} onClick={handleDelete}>
              Yes, delete
            </button>
          ) : (
            <button className="btn-secondary flex-1" onClick={() => setConfirmingDelete(true)}>
              Delete
            </button>
          )}
        </div>
      )}
      {error && <p className="text-sm text-accent">{error}</p>}

      <ThumbBar armKey="routine" aboveTabBar>
        <Link
          to={`/checkin/${template.id}`}
          className="btn-primary btn-lg w-full"
        >
          Start workout
        </Link>
      </ThumbBar>
    </div>
  )
}
