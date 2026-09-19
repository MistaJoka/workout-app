import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllSessionHistory, getPlan } from '../../infrastructure/db/repositories/sessionRepository'
import { getTemplate } from '../../domain/content/catalog'
import { projectSetRecords } from '../../domain/progress/history'
import { calculateStreak, detectPersonalRecords, weeklyTotals } from '../../domain/progress/stats'
import type { PersonalRecord, WeekTotal } from '../../domain/progress/types'
import type { SessionResult } from '../../domain/session/types'
import { formatWeight } from '../units'
import { useWeightUnit } from '../components/useWeightUnit'
import { BodyWeightCard } from '../components/BodyWeightCard'

type HistoryRow = SessionResult & { workoutName: string }

type Snapshot = {
  rows: HistoryRow[]
  streak: number
  weeks: WeekTotal[]
  records: PersonalRecord[]
}

export function ProgressScreen() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [unit] = useWeightUnit()

  useEffect(() => {
    load().then(setSnapshot)
  }, [])

  async function load(): Promise<Snapshot> {
    const { plans, results, events } = await getAllSessionHistory()
    const sorted = [...results].sort((a, b) => b.endedAt.localeCompare(a.endedAt))
    const rows = await Promise.all(
      sorted.map(async (result) => {
        const plan = await getPlan(result.planId)
        const workoutName = (plan && (await getTemplate(plan.templateId))?.name) ?? 'Workout'
        return { ...result, workoutName }
      })
    )
    const setRecords = projectSetRecords(plans, results, events)
    const now = new Date()
    return {
      rows,
      streak: calculateStreak(results, now),
      weeks: weeklyTotals(results, now, 8),
      records: [...detectPersonalRecords(setRecords).values()].sort((a, b) => a.exerciseName.localeCompare(b.exerciseName)),
    }
  }

  const rows = snapshot?.rows ?? null
  const totalWorkouts = rows?.length ?? 0
  const totalSets = rows?.reduce((sum, r) => sum + r.totalSetsCompleted, 0) ?? 0

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Progress</h1>

      {snapshot === null && <p className="text-ink-muted">Loading…</p>}

      <BodyWeightCard />

      {rows && rows.length === 0 && (
        <p className="text-ink-muted">No workouts yet. Your first one will show up here.</p>
      )}

      {snapshot && rows && rows.length > 0 && (
        <>
          <div className="flex gap-3">
            <Stat value={totalWorkouts} label={totalWorkouts === 1 ? 'workout' : 'workouts'} />
            <Stat value={totalSets} label="sets done" />
            <Stat value={snapshot.streak} label="day streak" />
          </div>

          <section className="card p-3">
            <p className="text-xs text-ink-muted">Workouts per week, last 8 weeks</p>
            <WeekBars weeks={snapshot.weeks} />
          </section>

          {snapshot.records.length > 0 && (
            <section className="space-y-2">
              <p className="text-sm font-semibold text-ink-muted">By exercise</p>
              <ul className="space-y-2">
                {snapshot.records.map((record) => (
                  <li key={record.exerciseId}>
                    <Link
                      to={`/progress/${encodeURIComponent(record.exerciseId)}`}
                      className="flex items-center justify-between gap-2 card px-4 py-3"
                    >
                      <span className="min-w-0 truncate font-semibold">{record.exerciseName}</span>
                      <span className="flex-none text-sm text-ink-muted">
                        Best{' '}
                        {record.unit === 'kg'
                          ? `${record.reps ?? ''} × ${formatWeight(record.value, unit)}`
                          : `${record.value}${record.unit === 'seconds' ? 's' : ''}`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {rows && rows.length > 0 && (
        <section className="space-y-2">
          <p className="text-sm font-semibold text-ink-muted">History</p>
          <ul className="space-y-2">
            {rows.map((row) => (
              <li key={row.sessionId} className="card p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-semibold">{row.workoutName}</p>
                  <p className="text-xs text-ink-muted">{formatDate(row.endedAt)}</p>
                </div>
                <p className="text-sm text-ink-muted">
                  {row.totalSetsCompleted}/{row.totalSetsPlanned} sets
                  {row.status === 'COMPLETED_SHORTENED' ? ', ended early' : ''}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex-1 field-info p-3 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-ink-muted">{label}</p>
    </div>
  )
}

// Inline SVG, no chart library; colors come from the theme's CSS variables
// so both themes render it without duplicated logic.
function WeekBars({ weeks }: { weeks: WeekTotal[] }) {
  const width = 320
  const height = 72
  const gap = 6
  const barWidth = (width - gap * (weeks.length - 1)) / weeks.length
  const max = Math.max(1, ...weeks.map((w) => w.sessions))
  const plotHeight = height - 18

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 w-full" role="img" aria-label="Workouts per week">
      {weeks.map((week, i) => {
        const h = week.sessions === 0 ? 2 : Math.max(4, (week.sessions / max) * plotHeight)
        const x = i * (barWidth + gap)
        const y = plotHeight - h
        const isCurrent = i === weeks.length - 1
        return (
          <g key={week.weekStart}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={h}
              rx={3}
              fill={week.sessions === 0 ? 'var(--color-border)' : isCurrent ? 'var(--color-primary)' : 'var(--color-accent)'}
            />
            {week.sessions > 0 && (
              <text x={x + barWidth / 2} y={y - 4} textAnchor="middle" fontSize="10" fill="var(--color-text-muted)">
                {week.sessions}
              </text>
            )}
            <text x={x + barWidth / 2} y={height - 4} textAnchor="middle" fontSize="9" fill="var(--color-text-muted)">
              {weekLabel(week.weekStart)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function weekLabel(weekStart: string): string {
  const [, m, d] = weekStart.split('-')
  return `${Number(m)}/${Number(d)}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
