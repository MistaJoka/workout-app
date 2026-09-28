import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getExercise } from '../../domain/content/catalog'
import { muscleGroupLabel } from '../../domain/content/library'
import type { Exercise, WorkoutTemplate } from '../../domain/content/types'
import {
  addExerciseToCustomTemplate,
  listCustomTemplates,
} from '../../infrastructure/db/repositories/customTemplateRepository'
import { MovementMedia } from '../components/MovementMedia'
import { BackButton } from '../components/BackButton'
import { defaultPrescription } from './routineBuilderRows'

export function ExerciseDetailScreen() {
  const { exerciseId } = useParams()
  const navigate = useNavigate()
  const [exercise, setExercise] = useState<Exercise | null | undefined>(undefined)
  // null: sheet closed. Only custom routines: the curated ones are fixed content.
  const [routines, setRoutines] = useState<WorkoutTemplate[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!exerciseId) return
    getExercise(exerciseId).then((e) => setExercise(e ?? null))
  }, [exerciseId])

  if (exercise === undefined) return <div className="p-4">Loading…</div>
  if (exercise === null) {
    return (
      <div className="p-4 space-y-2">
        <p>That exercise isn't in the library.</p>
        <button className="underline" onClick={() => navigate('/library')}>
          Back to Library
        </button>
      </div>
    )
  }

  const current = exercise
  const newRoutine = () => navigate(`/routines/new?add=${encodeURIComponent(current.id)}`)

  async function openSheet() {
    setError(null)
    const existing = await listCustomTemplates().catch(() => [])
    // No routines yet: the only choice is a new one, so skip the sheet.
    if (existing.length === 0) newRoutine()
    else setRoutines(existing)
  }

  async function addTo(routine: WorkoutTemplate) {
    setBusy(true)
    setError(null)
    try {
      const outcome = await addExerciseToCustomTemplate(routine.id, current.id, defaultPrescription(current))
      if (outcome === 'missing') {
        setError('That routine was deleted.')
        setRoutines(await listCustomTemplates())
        setBusy(false)
        return
      }
      navigate(`/routines/${routine.id}`, { state: { added: current.name } })
    } catch {
      setError("Couldn't save on this device. Try again.")
      setBusy(false)
    }
  }

  const meta = [
    exercise.taxonomy.primaryMuscles?.map(muscleGroupLabel).filter((v, i, a) => a.indexOf(v) === i).join(', '),
    exercise.taxonomy.equipment[0] === 'bodyweight' ? 'No equipment' : exercise.taxonomy.equipment[0],
    exercise.taxonomy.level,
  ].filter(Boolean)

  return (
    <div className="p-4 space-y-4 pb-24">
      <BackButton />
      <h1 className="text-2xl font-bold">{exercise.name}</h1>
      <p className="text-sm capitalize text-ink-muted">{meta.join(', ')}</p>

      <MovementMedia name={exercise.name} exerciseId={exercise.id} start={exercise.mediaManifest.start} finish={exercise.mediaManifest.finish} />

      <ol className="space-y-1.5 text-sm leading-snug">
        {[exercise.setup, ...exercise.executionPhases].filter(Boolean).map((step, i) => (
          <li key={i} className="flex gap-2">
            <span className="font-semibold text-ink-muted">{i + 1}.</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      <button className="btn-primary btn-lg w-full" onClick={openSheet}>
        Add to a routine
      </button>

      {routines && (
        <div className="fixed inset-0 z-40 flex items-end bg-ink/40" onClick={busy ? undefined : () => setRoutines(null)}>
          <div
            className="max-h-[80vh] w-full space-y-3 overflow-y-auto rounded-t-[var(--radius-panel)] bg-surface p-4"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Add to a routine"
          >
            <p className="text-center text-lg font-bold">Add to a routine</p>
            <ul className="space-y-2">
              {routines.map((routine) => {
                const already = routine.exercises.some((e) => e.exerciseId === current.id)
                return (
                  <li key={routine.id}>
                    <button
                      type="button"
                      className="flex min-h-12 w-full items-center justify-between gap-2 card px-4 py-3 text-left disabled:opacity-60"
                      disabled={busy || already}
                      onClick={() => addTo(routine)}
                    >
                      <span className="min-w-0 truncate font-semibold">{routine.name}</span>
                      <span className="flex-none text-sm text-ink-muted">{already ? 'Already in it' : '+'}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
            {error && <p className="text-center text-sm text-accent">{error}</p>}
            <button type="button" className="btn-secondary w-full" disabled={busy} onClick={newRoutine}>
              New routine
            </button>
            <button type="button" className="btn-primary btn-lg w-full" disabled={busy} onClick={() => setRoutines(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
