import { db } from '../schema'
import type { SessionEvent, SessionPlan, SessionResult } from '../../../domain/session/types'

export async function savePlan(plan: SessionPlan): Promise<void> {
  const existing = await db.sessionPlans.get(plan.id)
  if (existing) {
    throw new Error(
      `Session plan ${plan.id} already exists — SessionPlans are immutable snapshots and cannot be overwritten`
    )
  }
  await db.sessionPlans.put(plan)
}

export async function getPlan(id: string): Promise<SessionPlan | undefined> {
  return db.sessionPlans.get(id)
}

export async function appendEvent(event: SessionEvent): Promise<void> {
  const existing = await db.sessionEvents.where('eventId').equals(event.eventId).first()
  if (existing) {
    return
  }
  try {
    await db.sessionEvents.add(event)
  } catch (error) {
    if (error instanceof Error && error.name === 'ConstraintError') {
      return // Another concurrent call already inserted this eventId — fine, idempotent.
    }
    throw error
  }
}

export async function getEventsForSession(sessionId: string): Promise<SessionEvent[]> {
  return db.sessionEvents.where('sessionId').equals(sessionId).sortBy('seq')
}

export async function saveResult(result: SessionResult): Promise<void> {
  const existing = await db.sessionResults.get(result.sessionId)
  if (existing) {
    throw new Error(
      `Session result for ${result.sessionId} already exists — SessionResults are immutable once recorded`
    )
  }
  await db.sessionResults.put(result)
}

export async function getResult(sessionId: string): Promise<SessionResult | undefined> {
  return db.sessionResults.get(sessionId)
}

// Read-only snapshot for progress projections (src/domain/progress).
export async function getAllSessionHistory(): Promise<{
  plans: SessionPlan[]
  results: SessionResult[]
  events: SessionEvent[]
}> {
  // `type` isn't indexed; projectSetRecords filters to SET_COMPLETED itself.
  const [plans, results, events] = await Promise.all([
    db.sessionPlans.toArray(),
    db.sessionResults.toArray(),
    db.sessionEvents.toArray(),
  ])
  return { plans, results, events }
}

export async function getInProgressSessions(): Promise<SessionPlan[]> {
  const [plans, results] = await Promise.all([db.sessionPlans.toArray(), db.sessionResults.toArray()])
  const completedIds = new Set(results.map((r) => r.sessionId))
  return plans.filter((p) => !completedIds.has(p.id))
}
