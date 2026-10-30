import type { SessionPlan, SessionResult } from '../session/types'
import { activityDate } from './activities'

// The weekly goal, per week. Rewards are derived from history every time
// (XP, carrots, badges, blooms, bosses, streaks), so judging every past week
// against today's goal would let a schedule change re-score history: raise
// the goal and old bonuses, boss wins and even levels would vanish. Instead
// each week keeps the goal it started with:
// - the goal snapshotted on that week's first workout (SessionPlan.weeklyGoal);
// - for weeks whose workouts predate snapshots, one frozen legacy goal;
// - for a week with no workouts yet (this one, before the first), the live
//   schedule goal.
// A mid-week schedule change therefore starts next week, and nothing
// already earned can ever be taken back.

export type WeekGoal = number | ((dateInWeek: Date) => number)

export function goalForWeek(goal: WeekGoal, dateInWeek: Date): number {
  return typeof goal === 'number' ? goal : goal(dateInWeek)
}

// Local Monday of the date's week, as a stable key.
export function mondayKey(date: Date): string {
  const day = date.getDay()
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() + (day === 0 ? -6 : 1 - day))
  return `${monday.getFullYear()}-${monday.getMonth() + 1}-${monday.getDate()}`
}

// An activity done outside the app counts toward the week (stats.ts), so it
// can also be a week's first entry: its own snapshot (taken when it was
// logged) pins the goal then. Ordered by when it was logged, not the day
// it is for, so a back-dated activity can't re-score a week whose goal a
// workout already pinned. Deleted activities never happened.
export type WeekGoalActivity = { day: string; loggedAt: string; weeklyGoal?: number; deletedAt?: string | null }

export function buildWeekGoals(input: {
  plans: readonly SessionPlan[]
  results: readonly SessionResult[]
  activities?: readonly WeekGoalActivity[]
  legacyGoal: number
  currentGoal: number
}): (dateInWeek: Date) => number {
  const planGoal = new Map(input.plans.map((p) => [p.id, p.weeklyGoal]))
  const entries = [
    ...input.results.map((r) => ({ week: mondayKey(new Date(r.endedAt)), at: r.endedAt, snap: planGoal.get(r.planId) })),
    ...(input.activities ?? [])
      .filter((a) => a.deletedAt == null)
      .map((a) => ({ week: mondayKey(activityDate(a.day)), at: a.loggedAt, snap: a.weeklyGoal })),
  ].sort((a, b) => a.at.localeCompare(b.at))
  const byWeek = new Map<string, number>()
  for (const entry of entries) {
    if (byWeek.has(entry.week)) continue
    byWeek.set(entry.week, entry.snap != null && entry.snap > 0 ? entry.snap : input.legacyGoal)
  }
  return (date) => byWeek.get(mondayKey(date)) ?? input.currentGoal
}
