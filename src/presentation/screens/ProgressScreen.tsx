import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllSessionHistory } from '../../infrastructure/db/repositories/sessionRepository'
import { getTemplate } from '../../domain/content/catalog'
import { projectSetRecords } from '../../domain/progress/history'
import { calculateWeekStreak, detectPersonalRecords, weekProgress, weeklyGoal, weeklyTotals } from '../../domain/progress/stats'
import { getWeeklySchedule } from '../../infrastructure/db/repositories/scheduleRepository'
import { ROTATION } from '../../domain/content/fixtures/foundationStrengthStarter'
import { resolveToday } from '../../domain/schedule/weeklySchedule'
import type { PersonalRecord, WeekTotal } from '../../domain/progress/types'
import { formatWeight } from '../units'
import { useWeightUnit } from '../components/useWeightUnit'
import { BodyWeightCard } from '../components/BodyWeightCard'
import { buildHistoryRows, type HistoryRow } from './progressHistoryRows'
import { RaeNote } from '../components/RaeNote'

type Snapshot = {
  rows: HistoryRow[]
  // This week's finished workouts against weeklyGoal, and the weeks in a
  // row that met it. Progress leads with the week, so a first workout reads
  // "1 of 2", never "0 week streak".
  week: { done: number; goal: number; met: boolean }
  streak: number
  weeks: WeekTotal[]
  records: PersonalRecord[]
  // Where "Start a workout" goes before there's any history: today's
  // planned workout, else the first of the A/B rotation (as Today suggests
  // with no history), or Today itself on a planned rest day.
  startHref: string
}

export function ProgressScreen() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [unit] = useWeightUnit()

  useEffect(() => {
    let cancelled = false
    setFailed(false)
    load()
      .then((loaded) => {
        if (!cancelled) setSnapshot(loaded)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  async function load(): Promise<Snapshot> {
    const [{ plans, results, events }, schedule] = await Promise.all([getAllSessionHistory(), getWeeklySchedule()])
    const rows = await buildHistoryRows(plans, results, getTemplate)
    const setRecords = projectSetRecords(plans, results, events)
    const now = new Date()
    const resolution = resolveToday(schedule, now, ROTATION[0])
    const startId =
      resolution.kind === 'rest'
        ? null
        : (await getTemplate(resolution.templateId).catch(() => undefined))
          ? resolution.templateId
          : ROTATION[0]
    return {
      startHref: startId ? `/checkin/${encodeURIComponent(startId)}` : '/',
      rows,
      week: weekProgress(results, schedule, now),
      streak: calculateWeekStreak(results, weeklyGoal(schedule), now),
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

      {snapshot === null && !failed && <p className="text-ink-muted">Loading…</p>}
      {snapshot === null && failed && (
        <div className="card space-y-3 p-4 text-center">
          <p className="font-bold">Couldn't load your progress.</p>
          <button type="button" className="btn-primary w-full" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </button>
        </div>
      )}

      {snapshot && rows && rows.length === 0 && (
        <>
          <RaeNote expression="smile">Your first workout starts the scoreboard. I'll keep count.</RaeNote>
          <div className="flex gap-3">
            <Stat value={0} label="workouts" />
            <Stat value={0} label="sets done" />
            <WeekGoalStat {...snapshot.week} />
          </div>
          <Link to={snapshot.startHref} className="btn-primary btn-lg w-full">
            Start a workout
          </Link>
        </>
      )}

      {snapshot && rows && rows.length > 0 && (
        <RaeNote expression={snapshot.streak >= 3 ? 'cheer' : 'happy'}>
          <span className="font-semibold">
            {totalWorkouts === 1 ? '1 workout' : `${totalWorkouts} workouts`} and {totalSets} sets so far.
          </span>{' '}
          {snapshot.streak >= 2
            ? `${snapshot.streak} weeks in a row. `
            : snapshot.week.met
              ? 'Goal met this week. '
              : ''}
          Proud of you.
        </RaeNote>
      )}

      {snapshot && rows && rows.length > 0 && (
        <>
          <div className="flex gap-3">
            <Stat value={totalWorkouts} label={totalWorkouts === 1 ? 'workout' : 'workouts'} />
            <Stat value={totalSets} label="sets done" />
            <WeekGoalStat {...snapshot.week} />
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

      {/* After the workout wins, not before them: opening Progress should
          lead with what you've done, not a scale prompt. */}
      <BodyWeightCard />

      {rows && rows.length > 0 && (
        <section className="space-y-2">
          <p className="text-sm font-semibold text-ink-muted">History</p>
          <ul className="space-y-2">
            {rows.map((row) => (
              <li key={row.sessionId}>
                <Link to={`/history/${encodeURIComponent(row.sessionId)}`} className="block card p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-semibold">{row.workoutName}</p>
                    <p className="text-xs text-ink-muted">{formatDate(row.endedAt)}</p>
                  </div>
                  <p className="text-sm text-ink-muted">
                    {row.totalSetsCompleted}/{row.totalSetsPlanned} sets
                    {row.status === 'COMPLETED_SHORTENED' ? ', ended early' : ''}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function Stat({ value, label, hint }: { value: number; label: string; hint?: string }) {
  return (
    <div className="flex-1 field-info p-3 text-center">
      <p className="hud-num text-3xl font-bold">{value}</p>
      <p className="text-xs text-ink-muted">{label}</p>
      {hint && <p className="sr-only">{hint}</p>}
    </div>
  )
}

// This week toward the goal: a ring that fills per workout, "1 of 2" inside.
// Static (no animation), so every motion setting shows the same thing.
function WeekGoalStat({ done, goal, met }: { done: number; goal: number; met: boolean }) {
  const r = 15
  const circumference = 2 * Math.PI * r
  const filled = Math.min(done / goal, 1) * circumference
  return (
    <div className={`flex-1 p-3 text-center ${met ? 'field-success' : 'field-info'}`}>
      <svg viewBox="0 0 40 40" className="mx-auto h-11 w-11" aria-hidden>
        <circle cx="20" cy="20" r={r} fill="none" stroke="var(--color-border)" strokeWidth="5" />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          transform="rotate(-90 20 20)"
        />
      </svg>
      <p className="hud-num text-sm font-bold">
        {done} of {goal}
      </p>
      <p className="text-xs text-ink-muted">{met ? 'goal met' : 'this week'}</p>
      <p className="sr-only">
        {done} of {goal} workouts this week{met ? ', goal met' : ''}
      </p>
    </div>
  )
}

// Inline SVG, no chart library; colors come from the theme's CSS variables.
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
