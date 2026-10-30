import { db, type ActivityRecord } from '../schema'
import { newId } from '../../../shared/id'
import { liveActivities, validateActivityInput, type ActivityKind } from '../../../domain/progress/activities'
import { weeklyGoal } from '../../../domain/progress/stats'
import { getWeeklySchedule } from './scheduleRepository'

// Logs an activity done outside the app. The weekly goal is snapshotted
// the same way a SessionPlan's is (the live schedule goal), so a week this
// opens keeps that goal (domain/progress/weekGoals.ts).
export async function logActivity(
  input: { kind: ActivityKind; minutes: number; day: string },
  now: Date = new Date()
): Promise<ActivityRecord> {
  const problem = validateActivityInput(input, now)
  if (problem) throw new Error(`Invalid activity: ${problem}`)
  const at = now.toISOString()
  const record: ActivityRecord = {
    id: newId(),
    kind: input.kind,
    minutes: input.minutes,
    day: input.day,
    loggedAt: at,
    updatedAt: at,
    deletedAt: null,
    weeklyGoal: weeklyGoal(await getWeeklySchedule()),
  }
  await db.activities.add(record)
  return record
}

// Every row, tombstones included (backups carry them).
export async function listActivities(): Promise<ActivityRecord[]> {
  return db.activities.toArray()
}

// The activities that count, newest first.
export async function listLiveActivities(): Promise<ActivityRecord[]> {
  return liveActivities(await db.activities.toArray())
}

export async function deleteActivity(id: string, now: Date = new Date()): Promise<void> {
  const at = now.toISOString()
  await db.activities.update(id, { deletedAt: at, updatedAt: at })
}
