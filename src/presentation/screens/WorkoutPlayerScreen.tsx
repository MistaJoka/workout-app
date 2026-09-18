import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getCurrentState, getPlan, recordEvent } from '../../application/sessionService'
import type { SessionPlan, SessionState } from '../../domain/session/types'
import { isRestComplete, remainingRestMs } from '../../domain/session/restTimer'

type ActionType = 'SET_COMPLETED' | 'REST_ENDED' | 'REST_SKIPPED' | 'PAUSED' | 'RESUMED'

export function WorkoutPlayerScreen() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [plan, setPlan] = useState<SessionPlan | null>(null)
  const [state, setState] = useState<SessionState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    if (!sessionId) return
    const [loadedPlan, loadedState] = await Promise.all([getPlan(sessionId), getCurrentState(sessionId)])
    setPlan(loadedPlan ?? null)
    setState(loadedState)
  }, [sessionId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!sessionId) return
    if (state?.status === 'COMPLETED' || state?.status === 'COMPLETED_SHORTENED') {
      navigate(`/session/${sessionId}/complete`, { replace: true })
    }
  }, [state, sessionId, navigate])

  async function handleAction(type: ActionType) {
    if (!sessionId) return
    setBusy(true)
    setError(null)
    try {
      const next = await recordEvent(sessionId, type, crypto.randomUUID())
      setState(next)
    } catch {
      setError('Could not save — check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  async function handleEndWorkout() {
    if (!sessionId) return
    setBusy(true)
    setError(null)
    try {
      await recordEvent(sessionId, 'SESSION_COMPLETED_SHORTENED', crypto.randomUUID())
      navigate('/')
    } catch {
      setError('Could not end the workout — please try again.')
      setBusy(false)
    }
  }

  if (!plan || !state) {
    return <div className="p-4">Loading…</div>
  }

  if (state.status === 'PAUSED') {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-lg">Paused</p>
        {error && <p className="text-sm text-accent">{error}</p>}
        <button className="rounded-panel bg-primary px-4 py-2 text-white" disabled={busy} onClick={() => handleAction('RESUMED')}>
          Resume
        </button>
      </div>
    )
  }

  if (state.status === 'RESTING' && state.restEndsAt) {
    return (
      <RestingView
        restEndsAt={state.restEndsAt}
        busy={busy}
        error={error}
        onRestComplete={() => handleAction('REST_ENDED')}
        onSkip={() => handleAction('REST_SKIPPED')}
        onPause={() => handleAction('PAUSED')}
      />
    )
  }

  const exercise = plan.exercises[state.currentExerciseIndex]
  if (!exercise) {
    return <div className="p-4">Loading…</div>
  }

  return (
    <div className="p-6 space-y-4">
      <p className="text-sm text-ink-muted">
        Exercise {state.currentExerciseIndex + 1} of {plan.exercises.length}
      </p>
      <h2 className="text-2xl font-bold">{exercise.name}</h2>
      <p>
        Set {state.currentSetNumber} of {exercise.sets}
        {exercise.reps ? ` — ${exercise.reps} reps` : exercise.timeSeconds ? ` — ${exercise.timeSeconds}s` : ''}
      </p>
      {error && <p className="text-sm text-accent">{error}</p>}
      <div className="flex gap-2">
        <button className="rounded-panel border border-edge px-4 py-2" disabled={busy} onClick={() => handleAction('PAUSED')}>
          Pause
        </button>
        <button className="rounded-panel bg-primary px-4 py-2 text-white" disabled={busy} onClick={() => handleAction('SET_COMPLETED')}>
          Complete Set
        </button>
      </div>
      <button className="text-sm text-ink-muted underline" disabled={busy} onClick={handleEndWorkout}>
        End workout
      </button>
    </div>
  )
}

function RestingView({
  restEndsAt,
  busy,
  error,
  onRestComplete,
  onSkip,
  onPause,
}: {
  restEndsAt: string
  busy: boolean
  error: string | null
  onRestComplete: () => void
  onSkip: () => void
  onPause: () => void
}) {
  const [remainingMs, setRemainingMs] = useState(() => remainingRestMs(restEndsAt))

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingMs(remainingRestMs(restEndsAt))
      if (isRestComplete(restEndsAt)) {
        clearInterval(interval)
        onRestComplete()
      }
    }, 250)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restEndsAt])

  const seconds = Math.ceil(remainingMs / 1000)

  return (
    <div className="p-6 text-center space-y-6">
      <p className="text-lg">Rest</p>
      <p className="text-6xl font-bold tabular-nums" role="timer">
        {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
      </p>
      {error && <p className="text-sm text-accent">{error}</p>}
      <div className="flex justify-center gap-2">
        <button className="rounded-panel border border-edge px-4 py-2" disabled={busy} onClick={onPause}>
          Pause
        </button>
        <button className="rounded-panel border border-edge px-4 py-2" disabled={busy} onClick={onSkip}>
          Skip rest
        </button>
      </div>
    </div>
  )
}
