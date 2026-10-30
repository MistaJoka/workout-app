import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../infrastructure/db/schema'
import { appendEvent, deleteUnfinishedSession, saveResult } from '../infrastructure/db/repositories/sessionRepository'
import { loadSessionHistory, resetSessionHistoryCache } from './historyIndex'
import { eventsBySession } from '../domain/progress/historyIndex'
import { effectiveSetSlots } from '../domain/session/appliedEvents'
import type { SessionEvent, SessionPlan } from '../domain/session/types'

function plan(id: string): SessionPlan {
  return {
    id,
    templateId: 't',
    templateVersion: 1,
    packId: 'p',
    ruleVersion: 'v1',
    createdAt: '2026-10-01T10:00:00.000Z',
    exercises: [{ exerciseId: 'squat', exerciseVersion: 1, name: 'Squat', sets: 2, reps: 10, restSeconds: 30, order: 0 }],
    adaptations: [],
    reproducibilityHash: 'h',
  }
}

let n = 0
function event(sessionId: string, type: SessionEvent['type'], payload: Record<string, unknown> = {}): SessionEvent {
  n += 1
  return { eventId: `${sessionId}-${n}`, sessionId, type, timestamp: new Date(Date.UTC(2026, 9, 1, 10, n)).toISOString(), payload }
}

async function finished(id: string) {
  await db.sessionPlans.add(plan(id))
  for (const e of [
    event(id, 'SESSION_STARTED'),
    event(id, 'SET_COMPLETED', { exerciseId: 'squat', met: true }),
    event(id, 'REST_SKIPPED'),
    event(id, 'SET_COMPLETED', { exerciseId: 'squat', met: true }),
    event(id, 'SESSION_COMPLETED'),
  ])
    await appendEvent(e)
  await saveResult({
    sessionId: id,
    planId: id,
    status: 'COMPLETED',
    startedAt: '2026-10-01T10:00:00.000Z',
    endedAt: '2026-10-01T10:30:00.000Z',
    totalSetsCompleted: 2,
    totalSetsPlanned: 2,
  })
}

beforeEach(async () => {
  await db.sessionPlans.clear()
  await db.sessionEvents.clear()
  await db.sessionResults.clear()
  resetSessionHistoryCache()
})

describe('loadSessionHistory', () => {
  it('reads once until something is written', async () => {
    await finished('a')
    const first = await loadSessionHistory()
    expect(await loadSessionHistory()).toBe(first)
    expect(first.results.map((r) => r.sessionId)).toEqual(['a'])
  })

  it('reads again after a set, a finished workout, or a discard', async () => {
    await finished('a')
    const first = await loadSessionHistory()

    await db.sessionPlans.add(plan('b'))
    await appendEvent(event('b', 'SESSION_STARTED'))
    const started = await loadSessionHistory()
    expect(started).not.toBe(first)
    expect(started.plans.map((p) => p.id).sort()).toEqual(['a', 'b'])

    await appendEvent(event('b', 'SET_COMPLETED', { exerciseId: 'squat', met: true }))
    const set = await loadSessionHistory()
    expect(set.events.filter((e) => e.sessionId === 'b')).toHaveLength(2)

    await deleteUnfinishedSession('b')
    const discarded = await loadSessionHistory()
    expect(discarded.plans.map((p) => p.id)).toEqual(['a'])
    expect(discarded.events.some((e) => e.sessionId === 'b')).toBe(false)
  })

  it('reads again after the tables are cleared (an import or erase)', async () => {
    await finished('a')
    await loadSessionHistory()
    await db.sessionResults.clear()
    await db.sessionEvents.clear()
    await db.sessionPlans.clear()
    expect((await loadSessionHistory()).results).toEqual([])
  })

  it('never keeps a read that a write overtook', async () => {
    await finished('a')
    const reading = loadSessionHistory()
    await finished('b')
    await reading
    const after = await loadSessionHistory()
    expect(after.results.map((r) => r.sessionId).sort()).toEqual(['a', 'b'])
  })

  it('keeps an unchanged session (its plan and event list) across a re-read, so its replay stays cached', async () => {
    await finished('a')
    const first = await loadSessionHistory()
    const planA = first.plans.find((p) => p.id === 'a')!
    const listA = eventsBySession(first.events).get('a')!
    const slotsA = effectiveSetSlots(planA, listA)
    expect(Object.isFrozen(listA)).toBe(true)

    await finished('b')
    const second = await loadSessionHistory()
    expect(second.plans.find((p) => p.id === 'a')).toBe(planA)
    expect(eventsBySession(second.events).get('a')).toBe(listA)
    expect(effectiveSetSlots(planA, eventsBySession(second.events).get('a')!)).toBe(slotsA)
    // The new session is grouped from what was read, in stored order.
    expect(eventsBySession(second.events).get('b')!.map((e) => e.type)).toEqual([
      'SESSION_STARTED',
      'SET_COMPLETED',
      'REST_SKIPPED',
      'SET_COMPLETED',
      'SESSION_COMPLETED',
    ])
  })

  it('regroups a session that gained an event (a stray tap after the end)', async () => {
    await finished('a')
    const first = await loadSessionHistory()
    const listA = eventsBySession(first.events).get('a')!
    await appendEvent(event('a', 'SET_COMPLETED', { exerciseId: 'squat', met: true }))
    const second = await loadSessionHistory()
    const regrouped = eventsBySession(second.events).get('a')!
    expect(regrouped).not.toBe(listA)
    expect(regrouped).toHaveLength(listA.length + 1)
  })
})
