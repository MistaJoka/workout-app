import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getTemplate } from '../../domain/content/catalog'
import { summarizeSession, type SessionDetail, type SessionDetailSet } from '../../domain/progress/sessionDetail'
import { getEventsForSession, getPlan, getResult } from '../../infrastructure/db/repositories/sessionRepository'
import { formatWeight, type WeightUnit } from '../units'
import { useWeightUnit } from '../components/useWeightUnit'
import { BackButton } from '../components/BackButton'

type Loaded = { name: string; endedAt: string; detail: SessionDetail }

// One past workout, read-only: what was done, set by set. History is
// immutable, so there is nothing to edit here.
export function SessionDetailScreen() {
  const { sessionId } = useParams()
  const [unit] = useWeightUnit()
  const [loaded, setLoaded] = useState<Loaded | null | undefined>(undefined)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    setFailed(false)
    load(sessionId)
      .then((next) => {
        if (!cancelled) setLoaded(next)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [sessionId, attempt])

  if (failed) {
    return (
      <div className="p-4 space-y-4">
        <BackButton />
        <p className="font-bold">Couldn't load this workout.</p>
        <button type="button" className="btn-primary w-full" onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </button>
      </div>
    )
  }
  if (loaded === undefined) return <div className="p-4">Loading…</div>
  if (loaded === null) {
    return (
      <div className="p-4 space-y-4">
        <BackButton />
        <p>That workout isn't in your history.</p>
      </div>
    )
  }

  const { name, endedAt, detail } = loaded
  return (
    <div className="p-4 space-y-4 pb-24">
      <BackButton />
      <div>
        <h1 className="text-2xl font-bold">{name}</h1>
        <p className="text-sm text-ink-muted">
          {new Date(endedAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })},{' '}
          {detail.durationMinutes} min{detail.shortened ? ', ended early' : ''}
        </p>
      </div>

      <ul className="space-y-2">
        {detail.exercises.map((exercise) => (
          <li key={exercise.exerciseId} className="card p-3 space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="min-w-0 truncate font-semibold">{exercise.name}</p>
              <p className="flex-none text-xs text-ink-muted">
                {exercise.sets.length}/{exercise.plannedSets} sets
              </p>
            </div>
            {exercise.sets.length === 0 ? (
              <p className="text-sm text-ink-muted">{exercise.skipped ? 'Skipped' : 'Not reached'}</p>
            ) : (
              <ol className="flex flex-wrap gap-2">
                {exercise.sets.map((set) => (
                  <li
                    key={set.setNumber}
                    className={`rounded-control px-2 py-1 text-sm font-semibold tabular-nums ${set.met ? 'bg-field-success' : 'bg-bg text-ink-muted'}`}
                  >
                    {describeSet(set, unit)}
                    <span className="sr-only">{set.met ? ', done' : ', missed'}</span>
                    <span aria-hidden="true">{set.met ? ' ✓' : ' ✗'}</span>
                  </li>
                ))}
              </ol>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

async function load(sessionId: string): Promise<Loaded | null> {
  const [plan, result, events] = await Promise.all([getPlan(sessionId), getResult(sessionId), getEventsForSession(sessionId)])
  if (!plan || !result) return null
  const template = await getTemplate(plan.templateId).catch(() => undefined)
  return { name: template?.name ?? 'Workout', endedAt: result.endedAt, detail: summarizeSession(plan, result, events) }
}

function describeSet(set: SessionDetailSet, unit: WeightUnit): string {
  const amount = set.reps != null ? `${set.reps}` : `${set.seconds ?? 0}s`
  return set.weightKg != null ? `${amount} × ${formatWeight(set.weightKg, unit)}` : amount
}
