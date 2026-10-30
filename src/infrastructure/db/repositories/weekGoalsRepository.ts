import { db } from '../schema'
import type { SessionPlan, SessionResult } from '../../../domain/session/types'
import { weeklyGoal } from '../../../domain/progress/stats'
import { buildWeekGoals, type WeekGoalActivity } from '../../../domain/progress/weekGoals'
import type { WeeklySchedule } from '../../../domain/schedule/weeklySchedule'
import { getWeeklySchedule } from './scheduleRepository'
import { getSetting, setSetting } from './settingsRepository'

// The goal for workouts from before goals were snapshotted on each plan
// (2026-10-03): frozen to the schedule goal the first time this runs, so a
// later schedule change can't re-score those weeks either.
export const LEGACY_WEEKLY_GOAL_KEY = 'weeklyGoalLegacy'

// Per-week goal resolver for every derived reward (domain/progress/weekGoals.ts).
// Pass what the caller already loaded to skip re-reading it.
export async function loadWeekGoals(loaded?: {
  plans?: readonly SessionPlan[]
  results?: readonly SessionResult[]
  schedule?: WeeklySchedule | null
  activities?: readonly WeekGoalActivity[]
}): Promise<(dateInWeek: Date) => number> {
  const [plans, results, schedule, legacy, activities] = await Promise.all([
    loaded?.plans ?? db.sessionPlans.toArray(),
    loaded?.results ?? db.sessionResults.toArray(),
    loaded?.schedule !== undefined ? loaded.schedule : getWeeklySchedule(),
    getSetting<number>(LEGACY_WEEKLY_GOAL_KEY),
    // Other activities can open a week too. A failed read only loses their
    // goal snapshots, never the screen.
    loaded?.activities ?? db.activities.toArray().catch(() => []),
  ])
  const currentGoal = weeklyGoal(schedule)
  let legacyGoal = legacy
  if (legacyGoal == null) {
    legacyGoal = currentGoal
    await setSetting(LEGACY_WEEKLY_GOAL_KEY, legacyGoal).catch(() => {})
  }
  return buildWeekGoals({ plans, results, activities, legacyGoal, currentGoal })
}
