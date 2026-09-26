import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { startSession } from '../../application/sessionService'
import type { SessionPlan } from '../../domain/session/types'
import { formatWeight } from '../units'
import { useWeightUnit } from '../components/useWeightUnit'

export function SessionPreviewScreen() {
  const location = useLocation()
  const navigate = useNavigate()
  const [unit] = useWeightUnit()
  const plan = (location.state as { plan?: SessionPlan } | null)?.plan
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!plan) {
    return (
      <div className="p-4 space-y-2">
        <p>No session plan to preview.</p>
        <button className="underline" onClick={() => navigate('/')}>
          Back to Today
        </button>
      </div>
    )
  }

  async function handleStart() {
    if (!plan) return
    setStarting(true)
    setError(null)
    try {
      await startSession(plan)
      navigate(`/session/${plan.id}`)
    } catch {
      setError('Could not start the workout — please try again.')
      setStarting(false)
    }
  }

  return (
    <div className="p-4 pb-28 space-y-4">
      <h1 className="text-xl font-bold">Session Preview</h1>
      <ul className="space-y-2">
        {plan.exercises.map((exercise) => (
          <li key={exercise.exerciseId} className="card p-3">
            <p className="font-semibold">{exercise.name}</p>
            <p className="text-sm text-ink-muted">
              {exercise.sets} sets × {exercise.reps ? `${exercise.reps} reps` : `${exercise.timeSeconds}s`}
              {exercise.weightKg != null ? ` @ ${formatWeight(exercise.weightKg, unit)}` : ''} — rest {exercise.restSeconds}s
            </p>
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-accent">{error}</p>}
      <div className="fixed bottom-0 left-0 right-0 border-t-2 border-edge bg-surface p-4">
        <button
          className="btn-primary btn-lg w-full"
          disabled={starting}
          onClick={handleStart}
        >
          Start Workout
        </button>
      </div>
    </div>
  )
}
