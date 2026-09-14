import { replayEvents } from '../domain/session/sessionMachine'
import type { SessionEvent, SessionEventType, SessionPlan, SessionResult, SessionState } from '../domain/session/types'
import * as sessionRepo from '../infrastructure/db/repositories/sessionRepository'

export async function startSession(plan: SessionPlan): Promise<SessionState> {
  await sessionRepo.savePlan(plan)
  await sessionRepo.appendEvent({
    eventId: `${plan.id}:start`,
    sessionId: plan.id,
    type: 'SESSION_STARTED',
    timestamp: await nextTimestamp(plan.id),
    payload: {},
  })
  return getCurrentState(plan.id)
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
    timestamp: await nextTimestamp(sessionId),
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
  await sessionRepo.saveResult(result)
}

/**
 * Returns an ISO timestamp guaranteed to sort strictly after every event already
 * persisted for this session. Session actions can be recorded back-to-back within
 * the same millisecond (e.g. a session-start followed immediately by the first set
 * completion), and `Date.toISOString()` only has millisecond resolution. Because
 * `sessionRepository.getEventsForSession` orders events by their timestamp string,
 * a tie there falls back to primary-key (eventId) order, which can silently put a
 * later event before an earlier one and corrupt replay. Nudging forward by 1ms
 * whenever the clock hasn't advanced keeps event order well-defined without
 * touching the repository or state machine.
 */
async function nextTimestamp(sessionId: string): Promise<string> {
  const events = await sessionRepo.getEventsForSession(sessionId)
  const now = new Date()
  const last = events[events.length - 1]
  if (last) {
    const lastTime = new Date(last.timestamp).getTime()
    if (now.getTime() <= lastTime) {
      return new Date(lastTime + 1).toISOString()
    }
  }
  return now.toISOString()
}
