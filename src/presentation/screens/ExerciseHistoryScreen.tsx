import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getAllSessionHistory } from '../../infrastructure/db/repositories/sessionRepository'
import { projectSetRecords } from '../../domain/progress/history'
import { detectPersonalRecords, estimateOneRepMax, perExerciseHistory } from '../../domain/progress/stats'
import type { ExerciseHistoryPoint, PersonalRecord } from '../../domain/progress/types'
import { formatWeight } from '../units'
import { useWeightUnit } from '../components/useWeightUnit'

type View = {
  name: string
  record: PersonalRecord | undefined
  points: ExerciseHistoryPoint[]
}

export function ExerciseHistoryScreen() {
  const { exerciseId } = useParams()
  const navigate = useNavigate()
  const [view, setView] = useState<View | null | undefined>(undefined)
  const [unit] = useWeightUnit()

  useEffect(() => {
    if (!exerciseId) return
    load(exerciseId).then(setView)
  }, [exerciseId])

  async function load(id: string): Promise<View | null> {
    const { plans, results, events } = await getAllSessionHistory()
    const records = projectSetRecords(plans, results, events)
    const points = perExerciseHistory(records, id)
    if (points.length === 0) return null
    const name = records.find((r) => r.exerciseId === id)?.exerciseName ?? id
    return { name, record: detectPersonalRecords(records).get(id), points }
  }

  if (view === undefined) return <div className="p-4">Loading…</div>
  if (view === null) {
    return (
      <div className="p-4 space-y-2">
        <p>No history for this exercise yet.</p>
        <button className="underline" onClick={() => navigate('/progress')}>
          Back to Progress
        </button>
      </div>
    )
  }

  const metricUnit = view.points[view.points.length - 1].unit
  const latest = view.points[view.points.length - 1]
  const fmt = (value: number, reps?: number) =>
    metricUnit === 'kg' ? `${reps ?? ''}×${formatWeight(value, unit)}` : metricUnit === 'seconds' ? `${value}s` : `${value}`

  return (
    <div className="p-4 space-y-4">
      <button className="btn-ghost -ml-3" onClick={() => navigate(-1)}>
        ‹ Back
      </button>
      <h1 className="text-2xl font-bold">{view.name}</h1>

      <div className="flex gap-3">
        <Stat value={fmt(latest.prescribed, latest.reps)} label="last time" />
        {view.record && <Stat value={fmt(view.record.value, view.record.reps)} label="best" />}
        {metricUnit === 'kg' && view.record?.reps != null ? (
          <Stat value={formatWeight(estimateOneRepMax(view.record.value, view.record.reps), unit)} label="est. 1RM" />
        ) : (
          <Stat value={view.points.length} label={view.points.length === 1 ? 'session' : 'sessions'} />
        )}
      </div>

      <section className="card p-3">
        <p className="text-xs text-ink-muted">
          {metricUnit === 'kg' ? `Load (${unit})` : metricUnit === 'seconds' ? 'Seconds' : 'Reps'} per session, filled = every set done
        </p>
        <Sparkline points={view.points} />
      </section>

      <ul className="space-y-2">
        {[...view.points].reverse().map((point) => (
          <li key={point.sessionId} className="flex items-center justify-between card px-4 py-3">
            <span className="text-sm">{formatDate(point.sessionEndedAt)}</span>
            <span className="text-sm text-ink-muted">
              {metricUnit === 'kg'
                ? `${point.reps ?? '?'} × ${formatWeight(point.prescribed, unit)}`
                : `${point.prescribed}${metricUnit === 'seconds' ? 's' : ' reps'}`}
              {', '}
              {point.metSets}/{point.totalSets} sets
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex-1 field-info p-3 text-center">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-ink-muted">{label}</p>
    </div>
  )
}

function Sparkline({ points }: { points: ExerciseHistoryPoint[] }) {
  const width = 320
  const height = 80
  const pad = 10
  const values = points.map((p) => p.prescribed)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const step = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0
  const coords = points.map((p, i) => ({
    x: pad + i * step + (points.length === 1 ? (width - pad * 2) / 2 : 0),
    y: pad + (1 - (p.prescribed - min) / span) * (height - pad * 2),
    full: p.totalSets > 0 && p.metSets === p.totalSets,
  }))
  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 w-full" role="img" aria-label="History">
      {coords.length > 1 && <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth="2" />}
      {coords.map((c, i) => (
        <circle
          key={points[i].sessionId}
          cx={c.x}
          cy={c.y}
          r={5}
          fill={c.full ? 'var(--color-primary)' : 'var(--color-surface)'}
          stroke="var(--color-primary)"
          strokeWidth="2"
        />
      ))}
    </svg>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
