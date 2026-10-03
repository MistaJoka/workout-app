import type { SessionEvent, SessionPlan, SessionResult } from '../session/types'
import { goalForWeek, mondayKey as weekKey, type WeekGoal } from './weekGoals'
import { projectSetRecords } from './history'

// Bloom XP: a running total earned from finished workouts, derived from
// history every time (nothing stored to drift or import). It only ever goes
// up: resting, missing a set or a week costs nothing, and there is nothing to
// buy or lose. Sets count through projectSetRecords, so stray, undone and
// skipped taps never earn XP.
export const XP_RULES = {
  perSet: 10,
  perMetSet: 5,
  perWorkout: 25,
  // Once per week, on the workout that reaches the weekly goal.
  weeklyGoal: 50,
} as const

const FIRST_LEVEL_XP = 100
const GROWTH = 1.2

const LEVEL_NAMES = [
  'Seedling',
  'Sprout',
  'Bud',
  'Bloom',
  'Blossom',
  'Bouquet',
  'Garden',
  'Meadow',
  'Grove',
  'Orchard',
  'Wildflower',
  'Evergreen',
] as const

export type LevelInfo = {
  level: number
  name: string
  // XP into the current level, and the XP that level takes in all.
  into: number
  needed: number
  total: number
}

// XP to go from `level` to `level + 1`: 100, then about 20% more each level,
// rounded to tens so the numbers read cleanly.
function stepFor(level: number): number {
  return Math.round((FIRST_LEVEL_XP * GROWTH ** (level - 1)) / 10) * 10
}

function nameFor(level: number): string {
  if (level <= LEVEL_NAMES.length) return LEVEL_NAMES[level - 1]
  return `${LEVEL_NAMES[LEVEL_NAMES.length - 1]} ${level - LEVEL_NAMES.length + 1}`
}

export function levelFor(total: number): LevelInfo {
  let level = 1
  let floor = 0
  while (total >= floor + stepFor(level)) {
    floor += stepFor(level)
    level += 1
  }
  return { level, name: nameFor(level), into: total - floor, needed: stepFor(level), total }
}

export type XpHistory = {
  plans: readonly SessionPlan[]
  results: readonly SessionResult[]
  events: readonly SessionEvent[]
}

export type SessionXp = { gained: number; goalMet: boolean }

export function computeXp(history: XpHistory, weeklyGoal: WeekGoal): { total: number; bySession: Map<string, SessionXp> } {
  const results = [...history.results].sort((a, b) => a.endedAt.localeCompare(b.endedAt))
  const records = projectSetRecords(history.plans, history.results, history.events)
  const bySession = new Map<string, SessionXp>()
  // Grouped once: filtering every record per session made this quadratic.
  const recordsBySession = new Map<string, typeof records>()
  for (const r of records) recordsBySession.set(r.sessionId, [...(recordsBySession.get(r.sessionId) ?? []), r])
  const weekCounts = new Map<string, number>()
  let total = 0
  for (const result of results) {
    const sessionRecords = recordsBySession.get(result.sessionId) ?? []
    const met = sessionRecords.filter((r) => r.met).length
    const week = weekKey(new Date(result.endedAt))
    const inWeek = (weekCounts.get(week) ?? 0) + 1
    weekCounts.set(week, inWeek)
    const goalMet = inWeek === goalForWeek(weeklyGoal, new Date(result.endedAt))
    const gained =
      sessionRecords.length * XP_RULES.perSet +
      met * XP_RULES.perMetSet +
      XP_RULES.perWorkout +
      (goalMet ? XP_RULES.weeklyGoal : 0)
    bySession.set(result.sessionId, { gained, goalMet })
    total += gained
  }
  return { total, bySession }
}

export type SessionXpGain = {
  gained: number
  goalMet: boolean
  from: LevelInfo
  to: LevelInfo
  leveledUp: boolean
}

// What one finished session added: XP before it (every session that ended
// earlier) to XP with it, and whether that crossed a level.
export function sessionXpGain(history: XpHistory, weeklyGoal: WeekGoal, sessionId: string): SessionXpGain {
  const { bySession } = computeXp(history, weeklyGoal)
  const target = history.results.find((r) => r.sessionId === sessionId)
  const mine = bySession.get(sessionId)
  if (!target || !mine) {
    const now = levelFor(totalOf(bySession))
    return { gained: 0, goalMet: false, from: now, to: now, leveledUp: false }
  }
  let before = 0
  for (const r of history.results) {
    if (r.sessionId !== sessionId && r.endedAt.localeCompare(target.endedAt) < 0) before += bySession.get(r.sessionId)?.gained ?? 0
  }
  const from = levelFor(before)
  const to = levelFor(before + mine.gained)
  return { gained: mine.gained, goalMet: mine.goalMet, from, to, leveledUp: to.level > from.level }
}

function totalOf(bySession: Map<string, SessionXp>): number {
  let sum = 0
  for (const v of bySession.values()) sum += v.gained
  return sum
}
