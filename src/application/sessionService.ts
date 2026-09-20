import { replayEvents } from '../domain/session/sessionMachine'
import type { SessionEvent, SessionEventType, SessionPlan, SessionResult, SessionState } from '../domain/session/types'
import * as sessionRepo from '../infrastructure/db/repositories/sessionRepository'
import * as progressionRepo from '../infrastructure/db/repositories/familiarityProgressionRepository'
import { evaluateSessionProgression } from '../domain/adaptation/evaluateSessionProgression'

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
    const didPersist = await persistResultIfMissing(sessionId, state)
    // Gated on didPersist, not just "session is complete": recordEvent can
    // reach this branch more than once per session — an idempotent replay of
    // the same eventId, or a double-tap that mints two different eventIds
    // and runs both calls concurrently. Progression outcomes are not safe to
    // apply more than once (evaluateSessionProgression reads the persisted
    // progression state as its input — a second pass would compound), so
    // exactly one caller may win, and the win is decided by the atomic
    // result insert below, not by anything checked earlier in this function.
    if (didPersist) {
      await updateProgressionAfterSession(sessionId)
    }
  }
  return state
}

async function persistResultIfMissing(sessionId: string, state: SessionState): Promise<boolean> {
  const existing = await sessionRepo.getResult(sessionId)
  if (existing) {
    return false
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
    return true
  } catch (error) {
    // The getResult check above is only a fast path; it is not what makes
    // this safe. Two concurrent calls can both pass it. saveResult is an
    // atomic insert, so exactly one of them lands and the other gets
    // SessionResultExistsError — reported as "did not persist" so only the
    // winner applies progression. Anything else (quota, closed DB) is a real
    // failure and must surface.
    if (error instanceof sessionRepo.SessionResultExistsError) {
      return false
    }
    throw error
  }
}

async function updateProgressionAfterSession(sessionId: string): Promise<void> {
  const plan = await sessionRepo.getPlan(sessionId)
  if (!plan) {
    return
  }
  const events = await sessionRepo.getEventsForSession(sessionId)
  const progressionRecords = await Promise.all(plan.exercises.map((e) => progressionRepo.getProgression(e.exerciseId)))
  const progressionByExerciseId = new Map(
    progressionRecords.map((r) => [
      r.exerciseId,
      {
        currentPrescribedReps: r.currentPrescribedReps,
        currentWeightKg: r.currentWeightKg,
        consecutiveFailureStreak: r.consecutiveFailureStreak,
      },
    ])
  )
  const outcomes = evaluateSessionProgression(plan, events, progressionByExerciseId)
  for (const outcome of outcomes) {
    await progressionRepo.applyProgressionOutcome(outcome.exerciseId, outcome, {
      weighted: outcome.weighted,
      preservePending: outcome.preservePending,
    })
  }

  // Familiarity (§8: how much guidance to show) is a separate system from
  // progression — it only counts exposures, and only for exercises the user
  // actually performed at least one set of in this session.
  const exposedAt = new Date().toISOString()
  const performedExerciseIds = new Set(
    events.filter((e) => e.type === 'SET_COMPLETED').map((e) => e.payload.exerciseId as string | undefined)
  )
  for (const exercise of plan.exercises) {
    if (performedExerciseIds.has(exercise.exerciseId)) {
      await progressionRepo.recordExposure(exercise.exerciseId, exposedAt)
    }
  }
}
