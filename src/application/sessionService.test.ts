import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../infrastructure/db/schema'
import * as sessionRepo from '../infrastructure/db/repositories/sessionRepository'
import * as progressionRepo from '../infrastructure/db/repositories/familiarityProgressionRepository'
import { getProgression } from '../infrastructure/db/repositories/familiarityProgressionRepository'
import { getCurrentState, recordEvent, startSession } from './sessionService'
import type { SessionPlan } from '../domain/session/types'

const plan: SessionPlan = {
  id: 'session-1',
  templateId: 'placeholder.test-template',
  templateVersion: 1,
  packId: 'placeholder-pack',
  ruleVersion: 'v0',
  createdAt: '2026-09-13T00:00:00.000Z',
  exercises: [{ exerciseId: 'ex1', exerciseVersion: 1, name: 'Exercise One', sets: 1, reps: 10, restSeconds: 60, order: 0 }],
  adaptations: [],
  reproducibilityHash: 'test-hash',
}

beforeEach(async () => {
  await db.sessionPlans.clear()
  await db.sessionEvents.clear()
  await db.sessionResults.clear()
  await db.progression.clear()
})

describe('startSession', () => {
  it('persists the plan and returns an ACTIVE state', async () => {
    const state = await startSession(plan)
    expect(state.status).toBe('ACTIVE')
    const loadedPlan = await sessionRepo.getPlan(plan.id)
    expect(loadedPlan).toEqual(plan)
  })
})

describe('getCurrentState', () => {
  it('reconstructs state by replaying all persisted events for the session', async () => {
    await startSession(plan)
    await recordEvent(plan.id, 'SET_COMPLETED', 'evt-set-1')
    const state = await getCurrentState(plan.id)
    expect(state.status).toBe('COMPLETED')
  })

  it('throws a descriptive error if no plan exists for the session', async () => {
    await expect(getCurrentState('missing-session')).rejects.toThrow('missing-session')
  })
})

describe('recordEvent', () => {
  it('is idempotent: recording the same eventId twice does not change the outcome further', async () => {
    await startSession(plan)
    const once = await recordEvent(plan.id, 'SET_COMPLETED', 'evt-set-1')
    const twice = await recordEvent(plan.id, 'SET_COMPLETED', 'evt-set-1')
    expect(twice).toEqual(once)
  })

  it('persists a SessionResult once the session completes, with correct counts', async () => {
    await startSession(plan)
    await recordEvent(plan.id, 'SET_COMPLETED', 'evt-set-1')
    const result = await sessionRepo.getResult(plan.id)
    expect(result).toMatchObject({
      sessionId: plan.id,
      status: 'COMPLETED',
      totalSetsCompleted: 1,
      totalSetsPlanned: 1,
    })
  })

  it('does not overwrite an already-persisted SessionResult on a later idempotent replay', async () => {
    await startSession(plan)
    await recordEvent(plan.id, 'SET_COMPLETED', 'evt-set-1')
    const firstResult = await sessionRepo.getResult(plan.id)
    await recordEvent(plan.id, 'SET_COMPLETED', 'evt-set-1')
    const secondResult = await sessionRepo.getResult(plan.id)
    expect(secondResult).toEqual(firstResult)
  })

  it('completes a realistic multi-exercise, multi-set session through actual persistence, guarding the nextTimestamp ordering fix', async () => {
    const multiExercisePlan: SessionPlan = {
      id: 'session-multi',
      templateId: 'placeholder.test-template',
      templateVersion: 1,
      packId: 'placeholder-pack',
      ruleVersion: 'v0',
      createdAt: '2026-09-13T00:00:00.000Z',
      exercises: [
        { exerciseId: 'ex1', exerciseVersion: 1, name: 'Exercise One', sets: 3, reps: 10, restSeconds: 60, order: 0 },
        { exerciseId: 'ex2', exerciseVersion: 1, name: 'Exercise Two', sets: 3, reps: 8, restSeconds: 45, order: 1 },
      ],
      adaptations: [],
      reproducibilityHash: 'test-hash-multi',
    }
    const totalSets = multiExercisePlan.exercises.reduce((sum, e) => sum + e.sets, 0)

    await startSession(multiExercisePlan)

    let state = await getCurrentState(multiExercisePlan.id)
    for (let i = 0; i < totalSets; i++) {
      state = await recordEvent(multiExercisePlan.id, 'SET_COMPLETED', `set-completed-${i}`)
      // Every set except the very last one transitions to RESTING; end the rest
      // before recording the next set so back-to-back writes exercise the
      // same-millisecond ordering guard in `nextTimestamp`.
      if (i < totalSets - 1) {
        expect(state.status).toBe('RESTING')
        state = await recordEvent(multiExercisePlan.id, 'REST_ENDED', `rest-ended-${i}`)
      }
    }

    expect(state.status).toBe('COMPLETED')

    const replayed = await getCurrentState(multiExercisePlan.id)
    expect(replayed).toEqual(state)

    const result = await sessionRepo.getResult(multiExercisePlan.id)
    expect(result).toMatchObject({
      sessionId: multiExercisePlan.id,
      status: 'COMPLETED',
      totalSetsCompleted: totalSets,
      totalSetsPlanned: totalSets,
    })
  })

  it('updates the progression record for a reps-based exercise once the session completes', async () => {
    const repsPlan: SessionPlan = {
      ...plan,
      id: 'session-progression-1',
      exercises: [{ exerciseId: 'ex1', exerciseVersion: 1, name: 'Exercise One', sets: 1, reps: 10, restSeconds: 60, order: 0 }],
    }
    await startSession(repsPlan)
    await recordEvent(repsPlan.id, 'SET_COMPLETED', 'evt-set-1', { exerciseId: 'ex1', met: true })

    const progression = await getProgression('ex1')
    expect(progression.currentPrescribedReps).toBe(12) // ADJUSTED_WITHIN_BOUNDS: 10 + repsStep(2)
  })

  it('records one familiarity exposure per performed exercise when the session completes', async () => {
    const { getFamiliarity } = await import('../infrastructure/db/repositories/familiarityProgressionRepository')
    await db.familiarity.clear()
    const repsPlan: SessionPlan = {
      ...plan,
      id: 'session-familiarity-1',
      exercises: [
        { exerciseId: 'ex1', exerciseVersion: 1, name: 'Exercise One', sets: 1, reps: 10, restSeconds: 60, order: 0 },
        { exerciseId: 'ex2', exerciseVersion: 1, name: 'Exercise Two', sets: 1, reps: 10, restSeconds: 60, order: 1 },
      ],
    }
    await startSession(repsPlan)
    await recordEvent(repsPlan.id, 'SET_COMPLETED', 'evt-set-1', { exerciseId: 'ex1', met: true })
    await recordEvent(repsPlan.id, 'SESSION_COMPLETED_SHORTENED', 'evt-end')

    expect((await getFamiliarity('ex1')).exposureCount).toBe(1)
    expect((await getFamiliarity('ex2')).exposureCount).toBe(0)
  })

  it('does not double-apply progression on an idempotent replay of the completing event', async () => {
    const repsPlan: SessionPlan = {
      ...plan,
      id: 'session-progression-2',
      exercises: [{ exerciseId: 'ex1', exerciseVersion: 1, name: 'Exercise One', sets: 1, reps: 10, restSeconds: 60, order: 0 }],
    }
    await startSession(repsPlan)
    await recordEvent(repsPlan.id, 'SET_COMPLETED', 'evt-set-1', { exerciseId: 'ex1', met: true })
    await recordEvent(repsPlan.id, 'SET_COMPLETED', 'evt-set-1', { exerciseId: 'ex1', met: true })

    const progression = await getProgression('ex1')
    expect(progression.currentPrescribedReps).toBe(12)
  })

  it('applies progression exactly once when a double-tap fires two completing events concurrently', async () => {
    // A double-tap on "Complete Set" produces two events with different ids
    // (the UI mints a fresh UUID per tap), so appendEvent's idempotency does
    // not short-circuit the second call — both reach the completion branch
    // at the same time. Only one may persist the result and apply progression.
    const repsPlan: SessionPlan = {
      ...plan,
      id: 'session-progression-3',
      exercises: [{ exerciseId: 'ex1', exerciseVersion: 1, name: 'Exercise One', sets: 1, reps: 10, restSeconds: 60, order: 0 }],
    }
    await startSession(repsPlan)
    await Promise.all([
      recordEvent(repsPlan.id, 'SET_COMPLETED', 'evt-tap-a', { exerciseId: 'ex1', met: true }),
      recordEvent(repsPlan.id, 'SET_COMPLETED', 'evt-tap-b', { exerciseId: 'ex1', met: true }),
    ])

    const progression = await getProgression('ex1')
    expect(progression.currentPrescribedReps).toBe(12) // not 14 — a second pass would compound
    expect(await sessionRepo.getResult(repsPlan.id)).toMatchObject({ status: 'COMPLETED' })
  })
})

describe('atomicity', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('startSession leaves no orphaned plan when the start event cannot be written', async () => {
    vi.spyOn(sessionRepo, 'appendEvent').mockRejectedValueOnce(new Error('disk full'))
    await expect(startSession(plan)).rejects.toThrow('disk full')
    expect(await sessionRepo.getPlan(plan.id)).toBeUndefined()
  })

  it('a failure while applying progression rolls back the result, and the next read repairs it exactly once', async () => {
    const repsPlan: SessionPlan = {
      ...plan,
      id: 'session-atomic-1',
      exercises: [{ exerciseId: 'ex1', exerciseVersion: 1, name: 'Exercise One', sets: 1, reps: 10, restSeconds: 60, order: 0 }],
    }
    await startSession(repsPlan)
    vi.spyOn(progressionRepo, 'recordExposure').mockRejectedValueOnce(new Error('quota'))
    await expect(recordEvent(repsPlan.id, 'SET_COMPLETED', 'evt-set-1', { exerciseId: 'ex1', met: true })).rejects.toThrow(
      'quota'
    )
    // Nothing half-written: no result, no progression.
    expect(await sessionRepo.getResult(repsPlan.id)).toBeUndefined()
    expect((await getProgression('ex1')).currentPrescribedReps).toBeNull()

    // Reopening the session (a plain state read) finishes the job.
    const state = await getCurrentState(repsPlan.id)
    expect(state.status).toBe('COMPLETED')
    expect(await sessionRepo.getResult(repsPlan.id)).toMatchObject({ status: 'COMPLETED' })
    expect((await getProgression('ex1')).currentPrescribedReps).toBe(12)

    // And never twice.
    await getCurrentState(repsPlan.id)
    await recordEvent(repsPlan.id, 'SET_COMPLETED', 'evt-set-1', { exerciseId: 'ex1', met: true })
    expect((await getProgression('ex1')).currentPrescribedReps).toBe(12)
  })
})
