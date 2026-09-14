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
  const existing = await db.sessionEvents.get(event.eventId)
  if (existing) {
    return
  }
  await db.sessionEvents.put(event)
}

export async function getEventsForSession(sessionId: string): Promise<SessionEvent[]> {
  return db.sessionEvents.where('sessionId').equals(sessionId).sortBy('timestamp')
}

export async function saveResult(result: SessionResult): Promise<void> {
  await db.sessionResults.put(result)
}

export async function getResult(sessionId: string): Promise<SessionResult | undefined> {
  return db.sessionResults.get(sessionId)
}
