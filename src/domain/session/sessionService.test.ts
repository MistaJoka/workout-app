import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../infrastructure/db/schema'
import * as sessionRepo from '../../infrastructure/db/repositories/sessionRepository'
import { getCurrentState, recordEvent, startSession } from './sessionService'
import type { SessionPlan } from './types'

const plan: SessionPlan = {
  id: 'session-1',
  templateId: 'placeholder.test-template',
  templateVersion: 1,
  packId: 'placeholder-pack',
  ruleVersion: 'v0',
  createdAt: '2026-09-13T00:00:00.000Z',
  exercises: [{ exerciseId: 'ex1', exerciseVersion: 1, sets: 1, reps: 10, restSeconds: 60, order: 0 }],
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
})
