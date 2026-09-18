import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../infrastructure/db/schema'
import * as sessionRepo from '../infrastructure/db/repositories/sessionRepository'
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
})
