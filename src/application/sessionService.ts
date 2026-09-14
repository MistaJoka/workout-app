import { replayEvents } from '../domain/session/sessionMachine'
import type { SessionEvent, SessionEventType, SessionPlan, SessionResult, SessionState } from '../domain/session/types'
import * as sessionRepo from '../infrastructure/db/repositories/sessionRepository'

export async function startSession(plan: SessionPlan): Promise<SessionState> {
  await sessionRepo.savePlan(plan)
  await sessionRepo.appendEvent({
    eventId: `${plan.id}:start`,
    sessionId: plan.id,
    type: 'SESSION_STARTED',
    timestamp: new Date().toISOString(),
    payload: {},
  })
  return getCurrentState(plan.id)
}

export async function getPlan(sessionId: string): Promise<SessionPlan | undefined> {
  return sessionRepo.getPlan(sessionId)
}

export async function getCurrentState(sessionId: string): Promise<SessionState> {
  const plan = await sessionRepo.getPlan(sessionId)
  if (!plan) {
    throw new Error(`No session plan found for session ${sessionId}`)
  }
  const events = await sessionRepo.getEventsForSession(sessionId)
  return replayEvents(plan, events)
}

export async function recordEvent(
  sessionId: string,
  type: SessionEventType,
  eventId: string,
  payload: Record<string, unknown> = {}
): Promise<SessionState> {
  const event: SessionEvent = {
    eventId,
    sessionId,
    type,
    timestamp: new Date().toISOString(),
    payload,
  }
  await sessionRepo.appendEvent(event)
  const state = await getCurrentState(sessionId)
  if (state.status === 'COMPLETED' || state.status === 'COMPLETED_SHORTENED') {
    await persistResultIfMissing(sessionId, state)
  }
  return state
}

async function persistResultIfMissing(sessionId: string, state: SessionState): Promise<void> {
  const existing = await sessionRepo.getResult(sessionId)
  if (existing) {
    return
  }
  const plan = await sessionRepo.getPlan(sessionId)
  if (!plan) {
    throw new Error(`No session plan found for session ${sessionId}`)
  }
  const events = await sessionRepo.getEventsForSession(sessionId)
  const startEvent = events.find((e) => e.type === 'SESSION_STARTED')
  const completedCount = events.filter((e) => e.type === 'SET_COMPLETED').length
  const totalSetsPlanned = plan.exercises.reduce((sum, e) => sum + e.sets, 0)
  const result: SessionResult = {
    sessionId,
    planId: plan.id,
    status: state.status === 'COMPLETED' ? 'COMPLETED' : 'COMPLETED_SHORTENED',
    startedAt: startEvent?.timestamp ?? plan.createdAt,
    endedAt: new Date().toISOString(),
    totalSetsCompleted: completedCount,
    totalSetsPlanned,
  }
  try {
    await sessionRepo.saveResult(result)
  } catch {
    // Another call already persisted the result between our getResult
    // check and this write (e.g. a retried/duplicate recordEvent call
    // racing itself). saveResult's own guard rejected the second write —
    // that's fine, the result is already correctly persisted once.
  }
}
