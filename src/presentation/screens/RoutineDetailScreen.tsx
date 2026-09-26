import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getExercises, getTemplate } from '../../domain/content/catalog'
import type { Exercise, WorkoutTemplate } from '../../domain/content/types'
import { deleteCustomTemplate, isCustomTemplateId } from '../../infrastructure/db/repositories/customTemplateRepository'
import { formatWeight } from '../units'
import { useWeightUnit } from '../components/useWeightUnit'
import { BackButton } from '../components/BackButton'

export function RoutineDetailScreen() {
  const { templateId } = useParams()
  const navigate = useNavigate()
  const [unit] = useWeightUnit()
  const [template, setTemplate] = useState<WorkoutTemplate | null | undefined>(undefined)
  const [exercises, setExercises] = useState<Map<string, Exercise>>(new Map())
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    if (!templateId) return
    getTemplate(templateId).then(async (t) => {
      setTemplate(t ?? null)
      if (t) setExercises(await getExercises(t.exercises.map((e) => e.exerciseId)))
    })
  }, [templateId])

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
    await deleteCustomTemplate(template.id)
    navigate('/library', { replace: true })
  }

  return (
    <div className="p-4 space-y-4 pb-44">
      <BackButton />
      <h1 className="text-2xl font-bold">{template.name}</h1>

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
                {exercise?.mediaManifest.start ? (
                  <img src={exercise.mediaManifest.start} alt="" className="h-12 w-16 flex-none rounded-panel object-cover" />
                ) : (
                  <div className="h-12 w-16 flex-none rounded-panel bg-bg" />
                )}
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
            <button className="btn-danger flex-1" onClick={handleDelete}>
              Yes, delete
            </button>
          ) : (
            <button className="btn-secondary flex-1" onClick={() => setConfirmingDelete(true)}>
              Delete
            </button>
          )}
        </div>
      )}

      <div className="fixed bottom-16 left-0 right-0 border-t-2 border-edge bg-surface p-4">
        <Link
          to={`/checkin/${template.id}`}
          className="btn-primary btn-lg w-full"
        >
          Start workout
        </Link>
      </div>
    </div>
  )
}
