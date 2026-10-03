import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { RecapLink } from '../components/RecapEntry'
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
import { MonthBlooms } from '../components/MonthBlooms'
import { GardenCard } from '../components/GardenCard'
import { buildGarden, type Garden } from '../../domain/progress/garden'
import { Skeleton, SkeletonBlock, SkeletonList, SkeletonTiles } from '../components/Skeleton'
import { computeXp, levelFor, type LevelInfo } from '../../domain/progress/xp'
import { ShareCardButton } from '../components/ShareCardButton'
import { LevelBar } from '../components/XpCelebration'
import { labelFor, nextRoomUnlock } from '../roomUnlocks'
import { compareWeeks, type WeekCompare } from '../../domain/progress/weekCompare'
import { WeekCompareCard } from '../components/WeekCompareCard'
import { evaluateAchievements, type AchievementIcon } from '../../domain/progress/achievements'
import { AchievementBadge } from '../components/AchievementUnlocks'
import { RAE_STORY, unlockedChapters } from '../../domain/content/raeStory'
import { RaeFace, type RaeExpression } from '../components/Rae'
import { loadCarrotBalance } from '../components/CarrotCelebration'
import { loadLoveNotesSummary } from '../components/LoveNoteCelebration'

// How many rows "By exercise" and "History" show before "Show all" — short
// enough that Progress doesn't turn into a mile of scrolling once there's
// real history, long enough that a typical week is all there at a glance.
const LIST_PREVIEW_COUNT = 5

type Snapshot = {
  rows: HistoryRow[]
  // This week's finished workouts against weeklyGoal, and the weeks in a
  // row that met it. Progress leads with the week, so a first workout reads
  // "1 of 2", never "0 week streak".
  week: { done: number; goal: number; met: boolean }
  streak: number
  weeks: WeekTotal[]
  records: PersonalRecord[]
  garden: Garden
  // Bloom XP level (only ever goes up).
  level: LevelInfo
  // "This week vs last": positive-only highlights, never a decline.
  compare: WeekCompare
  // Badge collection summary for the compact "Your collection" tile: how
  // many are earned, how many exist, and the most recently earned icon (or
  // a neutral trophy before any are earned).
  badges: { earned: number; total: number; icon: AchievementIcon }
  // Rae's garden story: chapters unlocked so far, for the compact tile.
  storyChapters: number
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
  const [showAllExercises, setShowAllExercises] = useState(false)
  const [showAllHistory, setShowAllHistory] = useState(false)

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
    const goal = weeklyGoal(schedule)
    const achievements = evaluateAchievements({ plans, results, events }, goal)
    const earnedAchievements = achievements.filter((a) => a.unlockedAt)
    const newestBadge = [...earnedAchievements].sort((a, b) => (b.unlockedAt ?? '').localeCompare(a.unlockedAt ?? ''))[0]
    return {
      startHref: startId ? `/checkin/${encodeURIComponent(startId)}` : '/',
      rows,
      week: weekProgress(results, schedule, now),
      streak: calculateWeekStreak(results, goal, now),
      weeks: weeklyTotals(results, now, 8),
      records: [...detectPersonalRecords(setRecords).values()].sort((a, b) => a.exerciseName.localeCompare(b.exerciseName)),
      garden: buildGarden(results),
      level: levelFor(computeXp({ plans, results, events }, goal).total),
      compare: compareWeeks({ plans, results, events }, goal, now),
      badges: { earned: earnedAchievements.length, total: achievements.length, icon: newestBadge?.icon ?? 'trophy' },
      storyChapters: unlockedChapters(results.length).length,
    }
  }

  const rows = snapshot?.rows ?? null
  const totalWorkouts = rows?.length ?? 0
  const totalSets = rows?.reduce((sum, r) => sum + r.totalSetsCompleted, 0) ?? 0
  const exerciseRecords = snapshot?.records ?? []
  const shownRecords = showAllExercises ? exerciseRecords : exerciseRecords.slice(0, LIST_PREVIEW_COUNT)
  const shownHistory = rows ? (showAllHistory ? rows : rows.slice(0, LIST_PREVIEW_COUNT)) : []

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Progress</h1>

      {snapshot === null && !failed && (
        <Skeleton className="space-y-4">
          <SkeletonBlock className="h-12 rounded-panel" />
          <SkeletonTiles count={3} />
          <SkeletonBlock className="h-32 rounded-panel" />
          <SkeletonList rows={3} trailing />
        </Skeleton>
      )}
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
          {/* This week: level + unlock + a small share, the three headline
              tiles, and how this week compares to last. */}
          <section className="card p-3" data-testid="progress-level">
            <LevelBar level={snapshot.level} />
            <div className="mt-2 flex items-center justify-between gap-2">
              {(() => {
                const unlock = nextRoomUnlock(snapshot.level.level)
                return unlock ? (
                  <p className="min-w-0 flex-1 truncate text-xs text-ink-muted" data-testid="next-room-unlock">
                    Next unlock: {labelFor(unlock.item)} at level {unlock.level}
                  </p>
                ) : (
                  <span />
                )
              })()}
              <ShareCardButton data={{ kind: 'level', level: snapshot.level }} compact aria-label="Share your level" />
            </div>
          </section>
          <div className="flex gap-3">
            <Stat value={totalWorkouts} label={totalWorkouts === 1 ? 'workout' : 'workouts'} />
            <Stat value={totalSets} label="sets done" />
            <WeekGoalStat {...snapshot.week} />
          </div>

          <WeekCompareCard compare={snapshot.compare} />

          {/* Your collection: garden, badges and recaps as a compact tile
              grid instead of four full-width rows. */}
          <section className="space-y-2">
            <p className="text-sm font-semibold text-ink-muted">Your collection</p>
            <div className="grid grid-cols-2 gap-3">
              <GardenCard garden={snapshot.garden} compact />
              <BadgesTile earned={snapshot.badges.earned} total={snapshot.badges.total} icon={snapshot.badges.icon} />
              <StoryTile unlocked={snapshot.storyChapters} />
              <RecapLink compact />
              <RewardsShopTile />
              <LoveNotesTile />
            </div>
          </section>

          {/* Activity: the month calendar leads, the 8-week bar chart is a
              compact footnote underneath. */}
          <section className="space-y-2">
            <p className="text-sm font-semibold text-ink-muted">Activity</p>
            <MonthBlooms workouts={rows} />
            <section className="card p-3">
              <p className="text-xs text-ink-muted">Last 8 weeks</p>
              <WeekBars weeks={snapshot.weeks} />
            </section>
          </section>

          {exerciseRecords.length > 0 && (
            <section className="space-y-2">
              <p className="text-sm font-semibold text-ink-muted">By exercise</p>
              <ul className="space-y-2">
                {shownRecords.map((record) => (
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
              <ShowAllButton
                total={exerciseRecords.length}
                shown={LIST_PREVIEW_COUNT}
                expanded={showAllExercises}
                onClick={() => setShowAllExercises((v) => !v)}
              />
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
            {shownHistory.map((row) => (
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
          <ShowAllButton
            total={rows.length}
            shown={LIST_PREVIEW_COUNT}
            expanded={showAllHistory}
            onClick={() => setShowAllHistory((v) => !v)}
          />
        </section>
      )}
    </div>
  )
}

// A compact collection tile for the badge count, matching GardenCard's
// compact tile (same grid, same tap target, same "open the collection"
// pattern). The icon is the most recently earned badge, or a neutral
// trophy before any are earned.
function BadgesTile({ earned, total, icon }: { earned: number; total: number; icon: AchievementIcon }) {
  return (
    <Link
      to="/achievements"
      className="card flex min-h-11 flex-col items-center gap-1 p-3 text-center active:bg-field-primary"
      aria-label={`Your badges: ${earned} of ${total} earned. Open your badges`}
    >
      <AchievementBadge icon={icon} locked={earned === 0} size={34} />
      <p className="font-bold">Your badges</p>
      <p className="text-xs text-ink-muted">
        {earned} of {total}
      </p>
    </Link>
  )
}

// A compact collection tile for Rae's garden story: how many chapters have
// unlocked, with her face from the newest one (or a neutral face before the
// first chapter). Matches GardenCard/BadgesTile's compact tile shape.
function StoryTile({ unlocked }: { unlocked: number }) {
  const newest = RAE_STORY[unlocked - 1]
  return (
    <Link
      to="/story"
      className="card flex min-h-11 flex-col items-center gap-1 p-3 text-center active:bg-field-primary"
      aria-label={`Rae's story: ${unlocked} of ${RAE_STORY.length} chapters. Open the story`}
    >
      <RaeFace expression={(newest?.expression ?? 'neutral') as RaeExpression} size={34} motion="none" decorative />
      <p className="font-bold">Rae's story</p>
      <p className="text-xs text-ink-muted">
        {unlocked} of {RAE_STORY.length}
      </p>
    </Link>
  )
}

// Your collection's fifth tile: Hubby Bunny's reward shop, carrot balance
// as the headline number, same compact-tile shape as the other three.
function RewardsShopTile() {
  const [balance, setBalance] = useState<number | null>(null)
  useEffect(() => {
    let cancelled = false
    loadCarrotBalance()
      .then((b) => {
        if (!cancelled) setBalance(b)
      })
      .catch(() => {
        if (!cancelled) setBalance(null)
      })
    return () => {
      cancelled = true
    }
  }, [])
  return (
    <Link
      to="/rewards"
      className="card flex min-h-11 flex-col items-center gap-1 p-3 text-center active:bg-field-primary"
      aria-label={`Hubby's shop: ${balance ?? 0} ${(balance ?? 0) === 1 ? 'carrot' : 'carrots'}. Open the shop`}
    >
      <span aria-hidden="true" className="text-[2.125rem] leading-none">
        🥕
      </span>
      <p className="font-bold">Hubby's shop</p>
      <p className="hud-num text-xs text-ink-muted">{balance ?? 0} carrots</p>
    </Link>
  )
}

// Your collection's sixth tile: Hubby Bunny's love notes, how many have
// been opened so far. Matches the other compact tiles' shape; locked notes
// are never counted into the headline number shown here (that's a mystery
// reserved for /notes' own "N sealed" line).
function LoveNotesTile() {
  const [summary, setSummary] = useState<{ opened: number; total: number } | null>(null)
  useEffect(() => {
    let cancelled = false
    loadLoveNotesSummary()
      .then((s) => {
        if (!cancelled) setSummary(s)
      })
      .catch(() => {
        if (!cancelled) setSummary(null)
      })
    return () => {
      cancelled = true
    }
  }, [])
  const opened = summary?.opened ?? 0
  return (
    <Link
      to="/notes"
      className="card flex min-h-11 flex-col items-center gap-1 p-3 text-center active:bg-field-primary"
      aria-label={`Love notes: ${opened} opened. Open your love notes`}
    >
      <span aria-hidden="true" className="text-[2.125rem] leading-none">
        💌
      </span>
      <p className="font-bold">Love notes</p>
      <p className="hud-num text-xs text-ink-muted">{opened} opened</p>
    </Link>
  )
}

// "Show all (N)" / "Show less" for a list previewed to its first few rows.
// Renders nothing once everything already fits in the preview.
function ShowAllButton({
  total,
  shown,
  expanded,
  onClick,
}: {
  total: number
  shown: number
  expanded: boolean
  onClick: () => void
}) {
  if (total <= shown) return null
  return (
    <button type="button" className="btn-secondary min-h-11 w-full" aria-expanded={expanded} onClick={onClick}>
      {expanded ? 'Show less' : `Show all (${total})`}
    </button>
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
// Sized as a compact footnote under MonthBlooms, not a headline chart.
function WeekBars({ weeks }: { weeks: WeekTotal[] }) {
  const width = 320
  const height = 56
  const gap = 6
  const barWidth = (width - gap * (weeks.length - 1)) / weeks.length
  const max = Math.max(1, ...weeks.map((w) => w.sessions))
  const plotHeight = height - 16

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
            <text x={x + barWidth / 2} y={height - 3} textAnchor="middle" fontSize="9" fill="var(--color-text-muted)">
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
