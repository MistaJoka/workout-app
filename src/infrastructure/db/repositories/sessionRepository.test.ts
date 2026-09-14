// src/infrastructure/db/repositories/sessionRepository.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../schema'
import * as sessionRepo from './sessionRepository'
import type { SessionEvent, SessionPlan, SessionResult } from '../../../domain/session/types'

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

describe('sessionRepository', () => {
  it('saves and retrieves a session plan', async () => {
    await sessionRepo.savePlan(plan)
    const loaded = await sessionRepo.getPlan(plan.id)
    expect(loaded).toEqual(plan)
  })

  it('returns undefined for a plan that does not exist', async () => {
    const loaded = await sessionRepo.getPlan('missing-session')
    expect(loaded).toBeUndefined()
  })

  it('throws if a plan with the same id is saved twice, since SessionPlans are immutable snapshots', async () => {
    await sessionRepo.savePlan(plan)
    await expect(sessionRepo.savePlan(plan)).rejects.toThrow(plan.id)
  })

  it('appends events and retrieves them in timestamp order for a session', async () => {
    const events: SessionEvent[] = [
      { eventId: 'e2', sessionId: plan.id, type: 'SET_COMPLETED', timestamp: '2026-09-13T00:01:00.000Z', payload: {} },
      { eventId: 'e1', sessionId: plan.id, type: 'SESSION_STARTED', timestamp: '2026-09-13T00:00:00.000Z', payload: {} },
    ]
    for (const event of events) {
      await sessionRepo.appendEvent(event)
    }
    const loaded = await sessionRepo.getEventsForSession(plan.id)
    expect(loaded.map((e) => e.eventId)).toEqual(['e1', 'e2'])
  })

  it('appending an event with a duplicate eventId does not create a second row', async () => {
    const event: SessionEvent = {
      eventId: 'e1',
      sessionId: plan.id,
      type: 'SESSION_STARTED',
      timestamp: '2026-09-13T00:00:00.000Z',
      payload: {},
    }
    await sessionRepo.appendEvent(event)
    await sessionRepo.appendEvent(event)
    const loaded = await sessionRepo.getEventsForSession(plan.id)
    expect(loaded).toHaveLength(1)
  })

  it('saves and retrieves a session result', async () => {
    const result: SessionResult = {
      sessionId: plan.id,
      planId: plan.id,
      status: 'COMPLETED',
      startedAt: '2026-09-13T00:00:00.000Z',
      endedAt: '2026-09-13T00:10:00.000Z',
      totalSetsCompleted: 1,
      totalSetsPlanned: 1,
    }
    await sessionRepo.saveResult(result)
    const loaded = await sessionRepo.getResult(plan.id)
    expect(loaded).toEqual(result)
  })
})
