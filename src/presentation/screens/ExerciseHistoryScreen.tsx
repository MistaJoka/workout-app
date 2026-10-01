import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getAllSessionHistory } from '../../infrastructure/db/repositories/sessionRepository'
import { projectSetRecords } from '../../domain/progress/history'
import { detectPersonalRecords, estimateOneRepMax, perExerciseHistory } from '../../domain/progress/stats'
import type { ExerciseHistoryPoint, PersonalRecord } from '../../domain/progress/types'
import { formatWeight } from '../units'
import { useWeightUnit } from '../components/useWeightUnit'
import { BackButton } from '../components/BackButton'
import { RaeNote } from '../components/RaeNote'
import { layoutHistoryBars } from './historyBars'
import { Skeleton, SkeletonBlock, SkeletonHeading, SkeletonList, SkeletonTiles } from '../components/Skeleton'

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

  if (view === undefined) {
    return (
      <Skeleton className="p-4 space-y-4">
        <SkeletonHeading />
        <SkeletonTiles count={3} />
        <SkeletonBlock className="h-40 rounded-panel" />
        <SkeletonList rows={3} trailing />
      </Skeleton>
    )
  }
  if (view === null) {
    return (
      <div className="p-4 space-y-2">
        <RaeNote expression="smile">No history for this one yet. Do it once and it shows up here.</RaeNote>
        <button type="button" className="btn-ghost min-h-11" onClick={() => navigate('/progress')}>
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
      <BackButton />
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

      <section className="card space-y-2 p-3">
        <p className="text-xs text-ink-muted">
          {metricUnit === 'kg' ? `Load (${unit})` : metricUnit === 'seconds' ? 'Seconds' : 'Reps'} per session
        </p>
        <HistoryChart points={view.points} format={(v) => (metricUnit === 'kg' ? formatWeight(v, unit) : metricUnit === 'seconds' ? `${v}s` : `${v}`)} />
        {view.points.length === 1 ? (
          <p className="text-sm text-ink-muted">Do it again to see a trend.</p>
        ) : (
          <p className="flex items-center gap-3 text-xs text-ink-muted">
            <span className="flex items-center gap-1">
              <span aria-hidden className="inline-block h-3 w-3 rounded-sm bg-accent" /> every set done
            </span>
            <span className="flex items-center gap-1">
              <span aria-hidden className="inline-block h-3 w-3 rounded-sm border-2 border-accent" /> some sets missed
            </span>
          </p>
        )}
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
      <p className="hud-num text-2xl font-bold">{value}</p>
      <p className="text-xs text-ink-muted">{label}</p>
    </div>
  )
}

// Per-session bars, newest on the right (layoutHistoryBars). Solid = every
// set done, outlined = some missed; the best session is pink and labelled.
// Static, so every motion setting shows the same chart. Screen readers get a
// one-line summary and the same numbers as a table.
function HistoryChart({ points, format }: { points: ExerciseHistoryPoint[]; format: (value: number) => string }) {
  const layout = layoutHistoryBars(points)
  const best = layout.bars.find((b) => b.best)
  const summary = `${layout.bars.length === 1 ? '1 session' : `${layout.bars.length} sessions`}${best ? `, best ${format(best.value)} on ${best.date}` : ''}`
  return (
    <>
      <svg viewBox={`0 0 ${layout.width} ${layout.height}`} className="w-full" role="img" aria-label={summary}>
        <line
          x1={0}
          x2={layout.width}
          y1={layout.plotBottom + 0.5}
          y2={layout.plotBottom + 0.5}
          stroke="var(--color-border)"
          strokeWidth="1"
        />
        {layout.bars.map((bar) => {
          const color = bar.best ? 'var(--color-primary)' : 'var(--color-accent)'
          return (
            <g key={bar.sessionId}>
              <rect
                x={bar.x + 1}
                y={bar.y + 1}
                width={Math.max(0, bar.width - 2)}
                height={Math.max(0, bar.height - 1)}
                rx={4}
                fill={bar.full ? color : 'var(--color-surface)'}
                stroke={color}
                strokeWidth="2"
              />
              <text
                x={bar.x + bar.width / 2}
                y={bar.y - 4}
                textAnchor="middle"
                fontSize="10"
                fontWeight={bar.best ? 700 : 400}
                fill={bar.best ? 'var(--color-primary-ink)' : 'var(--color-text-muted)'}
              >
                {format(bar.value)}
              </text>
              <text
                x={bar.x + bar.width / 2}
                y={layout.height - 4}
                textAnchor="middle"
                fontSize="9"
                fill="var(--color-text-muted)"
              >
                {bar.date}
              </text>
            </g>
          )
        })}
      </svg>
      <table className="sr-only">
        <caption>Per session</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Value</th>
            <th scope="col">All sets done</th>
          </tr>
        </thead>
        <tbody>
          {layout.bars.map((bar) => (
            <tr key={bar.sessionId}>
              <td>{bar.date}</td>
              <td>
                {format(bar.value)}
                {bar.best ? ' (best)' : ''}
              </td>
              <td>{bar.full ? 'yes' : 'no'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
