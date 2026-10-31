import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../infrastructure/db/schema'
import { appendEvent, saveResult } from '../infrastructure/db/repositories/sessionRepository'
import { resetSessionHistoryCache } from './historyIndex'
import { loadCompleteStats, loadGoalBloom, loadHistoryWithGoals, loadLevel, loadNextUpLabel, loadSessionXp } from './progressSnapshot'
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

function event(eventId: string, type: SessionEvent['type'], minute: number, payload: Record<string, unknown> = {}): SessionEvent {
  return { eventId, sessionId: 's1', type, timestamp: new Date(Date.UTC(2026, 9, 1, 10, minute)).toISOString(), payload }
}

async function finishOne() {
  await db.sessionPlans.add(plan)
  await appendEvent(event('e1', 'SESSION_STARTED', 0))
  await appendEvent(event('e2', 'SET_COMPLETED', 1, { exerciseId: 'squat', met: true }))
  await appendEvent(event('e3', 'SESSION_COMPLETED', 2))
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
  await db.settings.clear()
  resetSessionHistoryCache()
})

describe('progressSnapshot', () => {
  it('loadHistoryWithGoals returns the history and a goal resolver', async () => {
    await finishOne()
    const { history, goal } = await loadHistoryWithGoals()
    expect(history.results).toHaveLength(1)
    expect(goal(new Date('2026-10-01T12:00:00Z'))).toBeGreaterThanOrEqual(1)
  })

  it('an empty history gives level 1 and no XP for an unknown session', async () => {
    expect((await loadLevel()).level).toBe(1)
    expect((await loadSessionXp('missing')).gained).toBe(0)
    expect(await loadGoalBloom('missing')).toBeNull()
  })

  it('a finished session earns XP, and the level and gain agree', async () => {
    await finishOne()
    const gain = await loadSessionXp('s1')
    expect(gain.gained).toBeGreaterThan(0)
    expect((await loadLevel()).level).toBe(gain.to.level)
    const next = await loadNextUpLabel()
    expect(next === null || typeof next === 'string').toBe(true)
  })

  it('loadCompleteStats reads the plan, result and events, or null when missing', async () => {
    expect(await loadCompleteStats('s1')).toBeNull()
    await finishOne()
    expect(await loadCompleteStats('s1')).toEqual({ minutes: 30, sets: 1, moves: 1 })
  })
})
