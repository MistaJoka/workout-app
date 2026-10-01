import type { SessionEvent, SessionPlan, SessionResult } from '../session/types'
import { projectSetRecords } from './history'
import { calculateVolume } from './stats'
import { computeXp } from './xp'
import type { SetRecord } from './types'

// "You vs last week": the current Monday-start week told next to the one
// before it, plus whatever it set against the user's own best-ever week.
// Positive only (CLAUDE.md ethics): a quieter week is never a loss, never a
// red arrow, just a calm line ("Rest weeks count too").

export type WeekMetrics = {
  workouts: number
  sets: number
  minutes: number
  xp: number
  // The single longest timed hold completed in the window, seconds (0 if none).
  longestHoldSeconds: number
  // Reps actually done across met, rep-based sets (calculateVolume's reps).
  totalReps: number
}

// One positive line. `value`, when present, is the number worth counting
// up to on screen (CountUp); `prefix`/`text` are the static parts around it
// so the UI never has to parse a number back out of a sentence. The full
// line always reconstructs as `${prefix}${value ?? ''}${text}` (see
// `highlightLabel`), which is what a screen reader and a test both read.
export type Highlight = { prefix: string; value?: number; text: string }

export type WeekCompare = {
  current: WeekMetrics
  previous: WeekMetrics
  // Up to 3 positive lines, most impressive first.
  highlights: Highlight[]
  // Shown instead, calmly, whenever there is nothing to highlight.
  fallback: string
}

export function highlightLabel(h: Highlight): string {
  return `${h.prefix}${h.value ?? ''}${h.text}`
}

export type WeekCompareHistory = {
  plans: readonly SessionPlan[]
  results: readonly SessionResult[]
  events: readonly SessionEvent[]
}

// Local Monday, matching recap.ts/stats.ts's own week-start arithmetic
// (each file keeps this tiny calendar helper rather than share one, so a
// change to one week definition can't silently move another's).
function weekStartOf(date: Date): Date {
  const day = (date.getDay() + 6) % 7 // Monday = 0
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - day)
}

function shiftDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

function weekKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function metricsFor(
  results: readonly SessionResult[],
  records: readonly SetRecord[],
  xpBySession: ReadonlyMap<string, { gained: number }>,
  start: Date,
  end: Date
): WeekMetrics {
  const inWindow = (iso: string) => {
    const t = new Date(iso).getTime()
    return t >= start.getTime() && t < end.getTime()
  }
  const mine = results.filter((r) => inWindow(r.endedAt))
  const sessionIds = new Set(mine.map((r) => r.sessionId))
  const minutes = mine.reduce(
    (sum, r) => sum + Math.max(1, Math.round((new Date(r.endedAt).getTime() - new Date(r.startedAt).getTime()) / 60_000)),
    0
  )
  const sets = mine.reduce((sum, r) => sum + r.totalSetsCompleted, 0)
  const xp = mine.reduce((sum, r) => sum + (xpBySession.get(r.sessionId)?.gained ?? 0), 0)
  const myRecords = records.filter((rec) => sessionIds.has(rec.sessionId))
  const totalReps = calculateVolume(myRecords).reps
  let longestHoldSeconds = 0
  for (const rec of myRecords) {
    if (rec.met && rec.prescribedSeconds != null) longestHoldSeconds = Math.max(longestHoldSeconds, rec.prescribedSeconds)
  }
  return { workouts: mine.length, sets, minutes, xp, longestHoldSeconds, totalReps }
}

// Every week (Monday key) any session fell into, each with its own totals,
// so "best ever" can be judged against the user's whole history rather than
// just the two weeks being shown.
function allWeeks(results: readonly SessionResult[]): Map<string, { workouts: number; sets: number }> {
  const byWeek = new Map<string, { workouts: number; sets: number }>()
  for (const r of results) {
    const key = weekKey(weekStartOf(new Date(r.endedAt)))
    const bucket = byWeek.get(key) ?? { workouts: 0, sets: 0 }
    bucket.workouts += 1
    bucket.sets += r.totalSetsCompleted
    byWeek.set(key, bucket)
  }
  return byWeek
}

function bestOtherThan(byWeek: ReadonlyMap<string, { workouts: number; sets: number }>, key: string, pick: 'workouts' | 'sets'): number {
  let best = 0
  for (const [k, v] of byWeek) {
    if (k === key) continue
    best = Math.max(best, v[pick])
  }
  return best
}

function calmFallback(current: WeekMetrics): string {
  return current.workouts === 0 ? 'Rest weeks count too.' : 'Every week adds to your story.'
}

type Candidate = { tier: number; highlight: Highlight }

function pushIfPositive(list: Candidate[], tier: number, delta: number, build: (n: number) => Highlight): void {
  if (delta > 0) list.push({ tier, highlight: build(delta) })
}

export function compareWeeks(history: WeekCompareHistory, weeklyGoalValue: number, now: Date): WeekCompare {
  const records = projectSetRecords(history.plans, history.results, history.events)
  const { bySession } = computeXp(history, weeklyGoalValue)

  const currentStart = weekStartOf(now)
  const currentEnd = shiftDays(currentStart, 7)
  const previousStart = shiftDays(currentStart, -7)

  const current = metricsFor(history.results, records, bySession, currentStart, currentEnd)
  const previous = metricsFor(history.results, records, bySession, previousStart, currentStart)

  const byWeek = allWeeks(history.results)
  const currentKey = weekKey(currentStart)
  const bestOtherWorkouts = bestOtherThan(byWeek, currentKey, 'workouts')
  const bestOtherSets = bestOtherThan(byWeek, currentKey, 'sets')

  // Best hold ever before this week, so a repeat of an old best doesn't
  // read as new.
  let priorBestHold = 0
  for (const rec of records) {
    if (rec.met && rec.prescribedSeconds != null && new Date(rec.sessionEndedAt).getTime() < currentStart.getTime()) {
      priorBestHold = Math.max(priorBestHold, rec.prescribedSeconds)
    }
  }

  const candidates: Candidate[] = []
  const newWorkoutRecord = current.workouts > 0 && current.workouts > bestOtherWorkouts
  const newSetsRecord = current.sets > 0 && current.sets > bestOtherSets
  const newHold = current.longestHoldSeconds > 0 && current.longestHoldSeconds > priorBestHold

  if (newWorkoutRecord) candidates.push({ tier: 0, highlight: { prefix: '', text: 'Most workouts in a week!' } })
  if (newSetsRecord) candidates.push({ tier: 0, highlight: { prefix: '', text: 'Most sets in a week!' } })
  if (newHold)
    candidates.push({ tier: 1, highlight: { prefix: 'Longest hold yet: ', value: current.longestHoldSeconds, text: 's' } })

  if (!newSetsRecord)
    pushIfPositive(candidates, 2, current.sets - previous.sets, (n) => ({ prefix: '+', value: n, text: ` ${n === 1 ? 'set' : 'sets'} vs last week` }))
  pushIfPositive(candidates, 3, current.totalReps - previous.totalReps, (n) => ({ prefix: '+', value: n, text: ' reps vs last week' }))
  pushIfPositive(candidates, 4, current.xp - previous.xp, (n) => ({ prefix: '+', value: n, text: ' XP vs last week' }))
  if (!newWorkoutRecord)
    pushIfPositive(candidates, 5, current.workouts - previous.workouts, (n) => ({
      prefix: '+',
      value: n,
      text: ` ${n === 1 ? 'workout' : 'workouts'} vs last week`,
    }))
  pushIfPositive(candidates, 6, current.minutes - previous.minutes, (n) => ({ prefix: '+', value: n, text: ' min vs last week' }))

  const highlights = candidates
    .sort((a, b) => a.tier - b.tier)
    .slice(0, 3)
    .map((c) => c.highlight)

  return { current, previous, highlights, fallback: calmFallback(current) }
}
