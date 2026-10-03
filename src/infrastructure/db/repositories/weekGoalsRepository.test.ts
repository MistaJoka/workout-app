import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../schema'
import { LEGACY_WEEKLY_GOAL_KEY, loadWeekGoals } from './weekGoalsRepository'
import { getSetting } from './settingsRepository'
import { saveWeeklySchedule } from './scheduleRepository'
import { EMPTY_SCHEDULE } from '../../../domain/schedule/weeklySchedule'

beforeEach(async () => {
  await db.settings.clear()
  await db.sessionPlans.clear()
  await db.sessionResults.clear()
})

describe('loadWeekGoals', () => {
  it('freezes the legacy goal to the schedule goal the first time, then keeps it', async () => {
    await saveWeeklySchedule({ ...EMPTY_SCHEDULE, 1: 'fs.full-body-a', 3: 'fs.full-body-b', 5: 'fs.quick-10' })
    await loadWeekGoals()
    expect(await getSetting(LEGACY_WEEKLY_GOAL_KEY)).toBe(3)
    // A later schedule change doesn't move the frozen value.
    await saveWeeklySchedule({ ...EMPTY_SCHEDULE, 1: 'fs.full-body-a' })
    const goals = await loadWeekGoals()
    expect(await getSetting(LEGACY_WEEKLY_GOAL_KEY)).toBe(3)
    // A week with no workouts follows the live schedule.
    expect(goals(new Date())).toBe(1)
  })
})
