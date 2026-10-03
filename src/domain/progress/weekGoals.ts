import type { SessionPlan, SessionResult } from '../session/types'

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

export function buildWeekGoals(input: {
  plans: readonly SessionPlan[]
  results: readonly SessionResult[]
  legacyGoal: number
  currentGoal: number
}): (dateInWeek: Date) => number {
  const planGoal = new Map(input.plans.map((p) => [p.id, p.weeklyGoal]))
  const byWeek = new Map<string, number>()
  const sorted = [...input.results].sort((a, b) => a.endedAt.localeCompare(b.endedAt))
  for (const r of sorted) {
    const key = mondayKey(new Date(r.endedAt))
    if (byWeek.has(key)) continue
    const snap = planGoal.get(r.planId)
    byWeek.set(key, snap != null && snap > 0 ? snap : input.legacyGoal)
  }
  return (date) => byWeek.get(mondayKey(date)) ?? input.currentGoal
}
