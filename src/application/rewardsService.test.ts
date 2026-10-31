import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../infrastructure/db/schema'
import { appendEvent, saveResult } from '../infrastructure/db/repositories/sessionRepository'
import { redeemReward } from '../infrastructure/db/repositories/redemptionsRepository'
import { resetSessionHistoryCache } from './historyIndex'
import { catchUpThenLoadUnread, loadCarrotBalance, loadEarnedCarrots, loadLoveNotesSummary, loadSessionCarrots } from './rewardsService'
import type { SessionEvent, SessionPlan } from '../domain/session/types'

const plan: SessionPlan = {
  id: 's1',
  templateId: 't',
  templateVersion: 1,
  packId: 'p',
  ruleVersion: 'v1',
  createdAt: '2026-10-01T10:00:00.000Z',
  exercises: [{ exerciseId: 'squat', exerciseVersion: 1, name: 'Squat', sets: 1, reps: 10, restSeconds: 30, order: 0 }],
  adaptations: [],
  reproducibilityHash: 'h',
}

async function finishOne() {
  await db.sessionPlans.add(plan)
  const events: SessionEvent[] = [
    { eventId: 'e1', sessionId: 's1', type: 'SESSION_STARTED', timestamp: '2026-10-01T10:00:00.000Z', payload: {} },
    { eventId: 'e2', sessionId: 's1', type: 'SET_COMPLETED', timestamp: '2026-10-01T10:01:00.000Z', payload: { exerciseId: 'squat', met: true } },
    { eventId: 'e3', sessionId: 's1', type: 'SESSION_COMPLETED', timestamp: '2026-10-01T10:02:00.000Z', payload: {} },
  ]
  for (const e of events) await appendEvent(e)
  await saveResult({
    sessionId: 's1',
    planId: 's1',
    status: 'COMPLETED',
    startedAt: '2026-10-01T10:00:00.000Z',
    endedAt: '2026-10-01T10:30:00.000Z',
    totalSetsCompleted: 1,
    totalSetsPlanned: 1,
  })
}

beforeEach(async () => {
  await db.sessionPlans.clear()
  await db.sessionEvents.clear()
  await db.sessionResults.clear()
  await db.redemptions.clear()
  await db.loveNotes.clear()
  await db.settings.clear()
  resetSessionHistoryCache()
})

describe('carrots', () => {
  it('start at zero with no history', async () => {
    expect(await loadEarnedCarrots()).toBe(0)
    expect(await loadCarrotBalance()).toBe(0)
    expect(await loadSessionCarrots('missing')).toBeNull()
  })

  it('a finished session earns carrots, and spending lowers the balance but not the earnings', async () => {
    await finishOne()
    const earned = await loadEarnedCarrots()
    expect(earned).toBeGreaterThan(0)
    expect((await loadSessionCarrots('s1'))?.total).toBeGreaterThan(0)
    await redeemReward({ id: 'r1', title: 'Foot rub', cost: 1 }, undefined, 'attempt-1', { earned })
    expect(await loadEarnedCarrots()).toBe(earned)
    expect(await loadCarrotBalance()).toBe(earned - 1)
  })
})

describe('love notes', () => {
  it('an empty box has no summary counts and no unread note', async () => {
    expect(await loadLoveNotesSummary()).toEqual({ opened: 0, total: 0, sealed: 0 })
    expect(await catchUpThenLoadUnread()).toBeNull()
  })
})
