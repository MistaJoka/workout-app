import { applyEvent, initSessionState, replayEvents } from '../domain/session/sessionMachine'
import { withoutIneffectiveSets } from '../domain/session/appliedEvents'
import type { SessionEvent, SessionEventType, SessionPlan, SessionResult, SessionState } from '../domain/session/types'
import * as sessionRepo from '../infrastructure/db/repositories/sessionRepository'
import * as progressionRepo from '../infrastructure/db/repositories/familiarityProgressionRepository'
import { evaluateSessionProgression } from '../domain/adaptation/evaluateSessionProgression'

// Plan and start event land together: a plan without its start event would
// be an orphan that is neither resumable nor complete.
export async function startSession(plan: SessionPlan): Promise<SessionState> {
  await sessionRepo.inSessionTransaction(async () => {
    await sessionRepo.savePlan(plan)
    await sessionRepo.appendEvent({
      eventId: `${plan.id}:start`,
      sessionId: plan.id,
      type: 'SESSION_STARTED',
      timestamp: new Date().toISOString(),
      payload: {},
    })
  })
  return getCurrentState(plan.id)
}

export async function getPlan(sessionId: string): Promise<SessionPlan | undefined> {
  return sessionRepo.getPlan(sessionId)
}

// Replays the session, and if it has ended but its result was never written
// (a write failed after the completing event landed), finishes that now —
// so simply reopening the session repairs it.
export async function getCurrentState(sessionId: string): Promise<SessionState> {
  const state = await replayState(sessionId)
  if (state.status === 'COMPLETED' || state.status === 'COMPLETED_SHORTENED') {
    await finalizeSession(sessionId, state)
  }
  return state
}

async function replayState(sessionId: string): Promise<SessionState> {
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
  return getCurrentState(sessionId)
}

// Result, progression and familiarity are one transaction: either all of
// them land or none do, and a later getCurrentState retries. Gated on
// didPersist, not just "session is complete": this runs on every read of a
// finished session and on double-taps that mint two different eventIds.
// Progression outcomes are not safe to apply more than once
// (evaluateSessionProgression reads the persisted progression state as its
// input — a second pass would compound), so exactly one caller may win, and
// the win is decided by the atomic result insert, not by anything checked
// earlier. IndexedDB serializes overlapping read-write transactions, so a
// concurrent caller sees the winner's result and does nothing.
async function finalizeSession(sessionId: string, state: SessionState): Promise<void> {
  if (await sessionRepo.getResult(sessionId)) {
    return
  }
  await sessionRepo.inSessionTransaction(async () => {
    const didPersist = await persistResultIfMissing(sessionId, state)
    if (didPersist) {
      await updateProgressionAfterSession(sessionId)
    }
  })
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
  // Only sets the machine applied (a racing duplicate tap is stored but ignored).
  const events = withoutIneffectiveSets(plan, await sessionRepo.getEventsForSession(sessionId))
  const startEvent = events.find((e) => e.type === 'SESSION_STARTED')
  const endEvent = completingEvent(plan, events)
  const completedCount = events.filter((e) => e.type === 'SET_COMPLETED').length
  const totalSetsPlanned = plan.exercises.reduce((sum, e) => sum + e.sets, 0)
  const result: SessionResult = {
    sessionId,
    planId: plan.id,
    status: state.status === 'COMPLETED' ? 'COMPLETED' : 'COMPLETED_SHORTENED',
    startedAt: startEvent?.timestamp ?? plan.createdAt,
    // When the workout actually ended, not when this write happened: a
    // result repaired on a later reopen must not move the workout to that day.
    endedAt: endEvent?.timestamp ?? new Date().toISOString(),
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

// The event that moved the replayed session into a finished status.
function completingEvent(plan: SessionPlan, events: readonly SessionEvent[]): SessionEvent | undefined {
  let state = initSessionState()
  for (const event of events) {
    state = applyEvent(plan, state, event)
    if (state.status === 'COMPLETED' || state.status === 'COMPLETED_SHORTENED') return event
  }
  return undefined
}

// Owner default ("go for all", 2026-09-29): a workout untouched for 12 hours
// is over. It is finished as ended early at its last action, so its sets
// count and nothing lands on the day it was noticed.
export const ABANDON_AFTER_MS = 12 * 60 * 60 * 1000

function lastEventAt(events: readonly SessionEvent[], fallback: string): string {
  return events.reduce((latest, e) => (e.timestamp > latest ? e.timestamp : latest), fallback)
}

async function endAt(plan: SessionPlan, at: string): Promise<void> {
  await sessionRepo.appendEvent({
    eventId: `${plan.id}:auto-end`,
    sessionId: plan.id,
    type: 'SESSION_COMPLETED_SHORTENED',
    timestamp: at,
    payload: { reason: 'idle' },
  })
  await getCurrentState(plan.id)
}

// Tidies unfinished sessions and returns the one to offer for resume, if
// any: sessions idle past ABANDON_AFTER_MS, and every recent one but the
// newest, are ended early at their last action. Idempotent.
export async function settleOpenSessions(now: Date = new Date()): Promise<SessionPlan | null> {
  const open = await sessionRepo.getInProgressSessions()
  let offered: SessionPlan | null = null
  for (const plan of open) {
    // A session whose end landed but whose result didn't is repaired here.
    const state = await getCurrentState(plan.id)
    if (state.status === 'COMPLETED' || state.status === 'COMPLETED_SHORTENED') continue
    const last = lastEventAt(await sessionRepo.getEventsForSession(plan.id), plan.createdAt)
    const idle = now.getTime() - Date.parse(last) > ABANDON_AFTER_MS
    if (!idle && offered === null) {
      offered = plan
      continue
    }
    await endAt(plan, last)
  }
  return offered
}

// Throws away an unfinished session (Today's "Discard"). Finished sessions
// are history and are refused.
export async function discardSession(sessionId: string): Promise<void> {
  await sessionRepo.deleteUnfinishedSession(sessionId)
}

async function updateProgressionAfterSession(sessionId: string): Promise<void> {
  const plan = await sessionRepo.getPlan(sessionId)
  if (!plan) {
    return
  }
  const events = withoutIneffectiveSets(plan, await sessionRepo.getEventsForSession(sessionId))
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
