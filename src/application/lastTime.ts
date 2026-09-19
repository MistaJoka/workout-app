import { db } from '../infrastructure/db/schema'
import { summarizeLastTime } from '../domain/session/lastTime'

// In-progress sessions have no SessionResult, so the current one is never
// counted as "last time" — only finished sessions are.
export async function getLastTimeSummary(exerciseId: string): Promise<string | null> {
  const results = await db.sessionResults.toArray()
  if (results.length === 0) return null
  const [plans, events] = await Promise.all([
    db.sessionPlans.bulkGet(results.map((r) => r.planId)),
    db.sessionEvents.where('sessionId').anyOf(results.map((r) => r.sessionId)).toArray(),
  ])
  return summarizeLastTime(
    plans.filter((p): p is NonNullable<typeof p> => p != null),
    results,
    events,
    exerciseId
  )
}
