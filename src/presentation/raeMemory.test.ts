import { describe, expect, it } from 'vitest'
import { buildRaeMemory } from './raeMemory'
import { speciesFor } from '../domain/progress/garden'
import type { SessionEvent, SessionPlan, SessionResult } from '../domain/session/types'

type ExerciseSpec = { exerciseId: string; name: string; sets: number; reps?: number; timeSeconds?: number }

function plan(id: string, templateId: string, exercises: ExerciseSpec[]): SessionPlan {
  return {
    id,
    templateId,
    templateVersion: 1,
    packId: 'test',
    ruleVersion: 'v1',
    createdAt: '2026-01-01T00:00:00.000Z',
    exercises: exercises.map((e, order) => ({
      exerciseId: e.exerciseId,
      exerciseVersion: 1,
      name: e.name,
      sets: e.sets,
      ...(e.reps != null ? { reps: e.reps } : {}),
      ...(e.timeSeconds != null ? { timeSeconds: e.timeSeconds } : {}),
      restSeconds: 30,
      order,
    })),
    adaptations: [],
    reproducibilityHash: `hash-${id}`,
  }
}

function result(sessionId: string, planId: string, endedAt: string, setsCompleted: number): SessionResult {
  return { sessionId, planId, status: 'COMPLETED', startedAt: endedAt, endedAt, totalSetsCompleted: setsCompleted, totalSetsPlanned: setsCompleted }
}

// Fills `count` plan slots as met SET_COMPLETED events, in plan order
// (appliedEvents.ts: no SESSION_STARTED means sets fill slots in order). A
// module-wide counter keeps eventIds unique across multiple calls for the
// same session (e.g. one call per exercise's reps).
let eventSeq = 0
function sets(sessionId: string, count: number, reps?: number): SessionEvent[] {
  return Array.from({ length: count }, () => ({
    eventId: `evt-${eventSeq++}`,
    sessionId,
    type: 'SET_COMPLETED',
    timestamp: '2026-01-01T00:00:00.000Z',
    payload: { met: true, ...(reps != null ? { reps } : {}) },
  }))
}

const names = { 'tpl.full-body-a': 'Full-Body A', 'tpl.full-body-b': 'Full-Body B' }

describe('buildRaeMemory', () => {
  it('is empty with no history', () => {
    const memory = buildRaeMemory({ plans: [], results: [], events: [], templateNames: names, now: new Date('2026-10-02T12:00:00Z') })
    expect(memory.lastSession).toBeNull()
    expect(memory.sameTemplateAsPrevious).toBe(false)
    expect(memory.recentRareFlower).toBeNull()
    expect(memory.justBeatHold).toBeNull()
  })

  it('singles out the move with the most sets when nothing beat a prior best', () => {
    const p = plan('p1', 'tpl.full-body-a', [
      { exerciseId: 'squat', name: 'Bodyweight Squat', sets: 3, reps: 10 },
      { exerciseId: 'pushup', name: 'Incline Push-Up', sets: 2, reps: 8 },
    ])
    const r = result('s1', 'p1', '2026-10-01T10:00:00.000Z', 5)
    const memory = buildRaeMemory({
      plans: [p],
      results: [r],
      events: sets('s1', 5),
      templateNames: names,
      now: new Date('2026-10-02T12:00:00.000Z'),
    })
    expect(memory.lastSession).toEqual({
      templateName: 'Full-Body A',
      standout: { exerciseName: 'Bodyweight Squat', isHold: false, isNewBest: false },
    })
  })

  it('prefers a new best over the move with the most sets', () => {
    const p1 = plan('p1', 'tpl.full-body-a', [{ exerciseId: 'squat', name: 'Squat', sets: 3, reps: 10 }])
    const p2 = plan('p2', 'tpl.full-body-a', [
      { exerciseId: 'squat', name: 'Squat', sets: 1, reps: 12 },
      { exerciseId: 'pushup', name: 'Push-Up', sets: 3, reps: 8 },
    ])
    const r1 = result('s1', 'p1', '2026-09-28T10:00:00.000Z', 3)
    const r2 = result('s2', 'p2', '2026-10-01T10:00:00.000Z', 4)
    const memory = buildRaeMemory({
      plans: [p1, p2],
      results: [r1, r2],
      events: [...sets('s1', 3, 10), ...sets('s2', 1, 12), ...sets('s2', 3, 8)],
      templateNames: names,
      now: new Date('2026-10-02T12:00:00.000Z'),
    })
    // Push-up has 3 of the 4 sets, but squat beat its own prior best (10 -> 12 reps).
    expect(memory.lastSession?.standout).toEqual({ exerciseName: 'Squat', isHold: false, isNewBest: true })
  })

  it('flags a new best on a hold/timed move', () => {
    const p1 = plan('p1', 'tpl.full-body-a', [{ exerciseId: 'plank', name: 'Plank', sets: 1, timeSeconds: 20 }])
    const p2 = plan('p2', 'tpl.full-body-a', [{ exerciseId: 'plank', name: 'Plank', sets: 1, timeSeconds: 30 }])
    const r1 = result('s1', 'p1', '2026-09-28T10:00:00.000Z', 1)
    const r2 = result('s2', 'p2', '2026-10-01T10:00:00.000Z', 1)
    const memory = buildRaeMemory({
      plans: [p1, p2],
      results: [r1, r2],
      events: [...sets('s1', 1), ...sets('s2', 1)],
      templateNames: names,
      now: new Date('2026-10-02T12:00:00.000Z'),
    })
    expect(memory.lastSession?.standout).toEqual({ exerciseName: 'Plank', isHold: true, isNewBest: true })
  })

  it('reports the just-finished session beating its own hold time', () => {
    const p1 = plan('p1', 'tpl.full-body-a', [{ exerciseId: 'plank', name: 'Plank', sets: 1, timeSeconds: 20 }])
    const p2 = plan('p2', 'tpl.full-body-a', [{ exerciseId: 'plank', name: 'Plank', sets: 1, timeSeconds: 35 }])
    const r1 = result('s1', 'p1', '2026-10-01T10:00:00.000Z', 1)
    const r2 = result('s2', 'p2', '2026-10-02T10:00:00.000Z', 1)
    const memory = buildRaeMemory({
      plans: [p1, p2],
      results: [r1, r2],
      events: [...sets('s1', 1), ...sets('s2', 1)],
      templateNames: names,
      now: new Date('2026-10-02T12:00:00.000Z'),
    })
    expect(memory.justBeatHold).toEqual({ exerciseName: 'Plank' })
  })

  it('has nothing to call out when the session has no met sets', () => {
    const p1 = plan('p1', 'tpl.full-body-a', [{ exerciseId: 'squat', name: 'Squat', sets: 2, reps: 10 }])
    const r1 = result('s1', 'p1', '2026-10-01T10:00:00.000Z', 0)
    const events: SessionEvent[] = [
      { eventId: 's1-0', sessionId: 's1', type: 'SET_COMPLETED', timestamp: '2026-01-01T00:00:00.000Z', payload: { met: false } },
      { eventId: 's1-1', sessionId: 's1', type: 'SET_COMPLETED', timestamp: '2026-01-01T00:00:00.000Z', payload: { met: false } },
    ]
    const memory = buildRaeMemory({ plans: [p1], results: [r1], events, templateNames: names, now: new Date('2026-10-02T12:00:00.000Z') })
    expect(memory.lastSession?.standout).toBeNull()
    expect(memory.justBeatHold).toBeNull()
  })

  it('flags two sessions in a row on the same template', () => {
    const p1 = plan('p1', 'tpl.full-body-a', [{ exerciseId: 'squat', name: 'Squat', sets: 1, reps: 10 }])
    const p2 = plan('p2', 'tpl.full-body-a', [{ exerciseId: 'squat', name: 'Squat', sets: 1, reps: 10 }])
    const p3 = plan('p3', 'tpl.full-body-b', [{ exerciseId: 'squat', name: 'Squat', sets: 1, reps: 10 }])
    const base = (id: string, pid: string, endedAt: string) => result(id, pid, endedAt, 1)
    const memorySame = buildRaeMemory({
      plans: [p1, p2],
      results: [base('s1', 'p1', '2026-09-30T10:00:00.000Z'), base('s2', 'p2', '2026-10-01T10:00:00.000Z')],
      events: [...sets('s1', 1, 10), ...sets('s2', 1, 10)],
      templateNames: names,
      now: new Date('2026-10-02T12:00:00.000Z'),
    })
    expect(memorySame.sameTemplateAsPrevious).toBe(true)
    expect(memorySame.lastSession?.templateName).toBe('Full-Body A')

    const memoryDifferent = buildRaeMemory({
      plans: [p1, p3],
      results: [base('s1', 'p1', '2026-09-30T10:00:00.000Z'), base('s3', 'p3', '2026-10-01T10:00:00.000Z')],
      events: [...sets('s1', 1, 10), ...sets('s3', 1, 10)],
      templateNames: names,
      now: new Date('2026-10-02T12:00:00.000Z'),
    })
    expect(memoryDifferent.sameTemplateAsPrevious).toBe(false)
  })

  it('has no streak to report with only one session', () => {
    const p1 = plan('p1', 'tpl.full-body-a', [{ exerciseId: 'squat', name: 'Squat', sets: 1, reps: 10 }])
    const memory = buildRaeMemory({
      plans: [p1],
      results: [result('s1', 'p1', '2026-10-01T10:00:00.000Z', 1)],
      events: sets('s1', 1, 10),
      templateNames: names,
      now: new Date('2026-10-02T12:00:00.000Z'),
    })
    expect(memory.sameTemplateAsPrevious).toBe(false)
  })

  it('surfaces a non-common flower grown within the last few days', () => {
    const nonCommonId = firstSessionIdWhere((rarity) => rarity !== 'common', 'recent')
    const p1 = plan('p1', 'tpl.full-body-a', [{ exerciseId: 'squat', name: 'Squat', sets: 1, reps: 10 }])
    const results = [result(nonCommonId, 'p1', '2026-10-01T10:00:00.000Z', 1)]
    const events = sets(nonCommonId, 1, 10)
    const memory = buildRaeMemory({ plans: [p1], results, events, templateNames: names, now: new Date('2026-10-02T12:00:00.000Z') })
    expect(memory.recentRareFlower).toEqual({ speciesName: speciesFor(nonCommonId).name })
  })

  it('ignores a common flower even when freshly grown', () => {
    const commonId = firstSessionIdWhere((rarity) => rarity === 'common', 'common')
    const p1 = plan('p1', 'tpl.full-body-a', [{ exerciseId: 'squat', name: 'Squat', sets: 1, reps: 10 }])
    const results = [result(commonId, 'p1', '2026-10-01T10:00:00.000Z', 1)]
    const events = sets(commonId, 1, 10)
    const memory = buildRaeMemory({ plans: [p1], results, events, templateNames: names, now: new Date('2026-10-02T12:00:00.000Z') })
    expect(memory.recentRareFlower).toBeNull()
  })

  it('ignores a rare flower grown more than a few days ago', () => {
    const farSessionId = firstSessionIdWhere((rarity) => rarity !== 'common', 'far')
    const p1 = plan('p1', 'tpl.full-body-a', [{ exerciseId: 'squat', name: 'Squat', sets: 1, reps: 10 }])
    const results = [result(farSessionId, 'p1', '2026-09-20T10:00:00.000Z', 1)]
    const events = sets(farSessionId, 1, 10)
    const memory = buildRaeMemory({ plans: [p1], results, events, templateNames: names, now: new Date('2026-10-02T12:00:00.000Z') })
    expect(memory.recentRareFlower).toBeNull()
  })
})

// Finds a sessionId (by trying a sequence of candidates under the given
// prefix) whose seeded garden species (garden.ts: speciesFor) satisfies
// `matches`. Throws if none of the first 500 candidates do, which would mean
// garden.ts's rarity weights changed.
function firstSessionIdWhere(matches: (rarity: string) => boolean, prefix: string): string {
  for (let i = 0; i < 500; i++) {
    const candidate = `${prefix}-session-${i}`
    if (matches(speciesFor(candidate).rarity)) return candidate
  }
  throw new Error(`no sessionId under "${prefix}-session-*" matched within 500 tries`)
}
