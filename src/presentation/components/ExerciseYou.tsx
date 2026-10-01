import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllSessionHistory } from '../../infrastructure/db/repositories/sessionRepository'
import { projectSetRecords } from '../../domain/progress/history'
import { summarizeExerciseForYou, type ExerciseYouSummary } from '../../domain/progress/exerciseYou'
import type { PersonalRecord } from '../../domain/progress/types'
import { getLastTimeSummary } from '../../application/lastTime'
import { formatWeight, type WeightUnit } from '../units'
import { useWeightUnit } from './useWeightUnit'

type Loaded = { summary: ExerciseYouSummary; lastTime: string | null }

// "You" on Exercise Detail: the user's own history with this move. Renders
// nothing until there is history (and nothing if it can't be read), so a
// new move shows no empty box.
export function ExerciseYou({ exerciseId }: { exerciseId: string }) {
  const [unit] = useWeightUnit()
  const [loaded, setLoaded] = useState<Loaded | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoaded(null)
    load(exerciseId)
      .then((next) => {
        if (!cancelled) setLoaded(next)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [exerciseId])

  if (!loaded) return null
  const { summary, lastTime } = loaded

  return (
    <section className="field-info space-y-2 p-4" aria-label="Your history with this move">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-bold">You</h2>
        <p className="text-xs text-ink-muted">
          {summary.sessions} {summary.sessions === 1 ? 'session' : 'sessions'}, last {shortDate(summary.lastEndedAt)}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-2">
        <div className="rounded-control bg-surface px-3 py-2">
          <dt className="text-xs text-ink-muted">Best</dt>
          <dd className="hud-num text-xl font-extrabold">{summary.best ? describeBest(summary.best, unit) : 'Not yet'}</dd>
        </div>
        <div className="rounded-control bg-surface px-3 py-2">
          <dt className="text-xs text-ink-muted">Last time</dt>
          <dd className="text-sm font-semibold leading-snug">{lastTime ? lastTime.replace(/^Last time:\s*/, '') : '—'}</dd>
        </div>
      </dl>
      <Link to={`/progress/${encodeURIComponent(exerciseId)}`} className="btn-ghost min-h-11 w-full">
        See your history
      </Link>
    </section>
  )
}

async function load(exerciseId: string): Promise<Loaded | null> {
  const { plans, results, events } = await getAllSessionHistory()
  const summary = summarizeExerciseForYou(projectSetRecords(plans, results, events), exerciseId)
  if (!summary) return null
  const lastTime = await getLastTimeSummary(exerciseId).catch(() => null)
  return { summary, lastTime }
}

function describeBest(best: PersonalRecord, unit: WeightUnit): string {
  if (best.unit === 'kg') return `${best.reps ?? ''} × ${formatWeight(best.value, unit)}`
  if (best.unit === 'seconds') return `${best.value}s`
  return `${best.value} reps`
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
