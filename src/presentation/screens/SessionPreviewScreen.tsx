import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { startSession } from '../../application/sessionService'
import type { SessionPlan } from '../../domain/session/types'

export function SessionPreviewScreen() {
  const location = useLocation()
  const navigate = useNavigate()
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
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Session Preview</h1>
      <ul className="space-y-2">
        {plan.exercises.map((exercise) => (
          <li key={exercise.exerciseId} className="rounded-panel border border-edge bg-surface p-3">
            <p className="font-semibold">{exercise.name}</p>
            <p className="text-sm text-ink-muted">
              {exercise.sets} sets × {exercise.reps ? `${exercise.reps} reps` : `${exercise.timeSeconds}s`} — rest{' '}
              {exercise.restSeconds}s
            </p>
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-accent">{error}</p>}
      <button
        className="rounded-panel bg-primary px-4 py-2 text-white disabled:opacity-50"
        disabled={starting}
        onClick={handleStart}
      >
        Start Workout
      </button>
    </div>
  )
}
