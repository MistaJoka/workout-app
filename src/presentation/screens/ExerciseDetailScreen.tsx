import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getExercise } from '../../domain/content/catalog'
import { muscleGroupLabel } from '../../domain/content/library'
import type { Exercise } from '../../domain/content/types'
import { MovementMedia } from '../components/MovementMedia'

export function ExerciseDetailScreen() {
  const { exerciseId } = useParams()
  const navigate = useNavigate()
  const [exercise, setExercise] = useState<Exercise | null | undefined>(undefined)

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

  const meta = [
    exercise.taxonomy.primaryMuscles?.map(muscleGroupLabel).filter((v, i, a) => a.indexOf(v) === i).join(', '),
    exercise.taxonomy.equipment[0] === 'bodyweight' ? 'No equipment' : exercise.taxonomy.equipment[0],
    exercise.taxonomy.level,
  ].filter(Boolean)

  return (
    <div className="p-4 space-y-4 pb-24">
      <button className="btn-ghost -ml-3" onClick={() => navigate(-1)}>
        ‹ Back
      </button>
      <h1 className="text-2xl font-bold">{exercise.name}</h1>
      <p className="text-sm capitalize text-ink-muted">{meta.join(', ')}</p>

      <MovementMedia name={exercise.name} start={exercise.mediaManifest.start} finish={exercise.mediaManifest.finish} />

      <ol className="space-y-1.5 text-sm leading-snug">
        {[exercise.setup, ...exercise.executionPhases].filter(Boolean).map((step, i) => (
          <li key={i} className="flex gap-2">
            <span className="font-semibold text-ink-muted">{i + 1}.</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      <button
        className="btn-primary btn-lg w-full"
        onClick={() => navigate(`/routines/new?add=${encodeURIComponent(exercise.id)}`)}
      >
        Add to a routine
      </button>
    </div>
  )
}
