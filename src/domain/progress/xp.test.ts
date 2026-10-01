import { describe, expect, it } from 'vitest'
import { computeXp, levelFor, sessionXpGain, XP_RULES } from './xp'
import type { SessionEvent, SessionPlan, SessionResult } from '../session/types'

function plan(id: string, sets = 2): SessionPlan {
  return {
    id,
    templateId: 't',
    templateVersion: 1,
    packId: 'p',
    ruleVersion: 'v1',
    createdAt: '2026-09-01T00:00:00.000Z',
    exercises: [{ exerciseId: 'squat', exerciseVersion: 1, name: 'Squat', sets, reps: 10, restSeconds: 45, order: 0 }],
    adaptations: [],
    reproducibilityHash: 'h',
  }
}

function result(id: string, endedAt: string): SessionResult {
  return { sessionId: id, planId: id, status: 'COMPLETED', startedAt: endedAt, endedAt, totalSetsCompleted: 2, totalSetsPlanned: 2 }
}

let seq = 0
function sets(sessionId: string, mets: boolean[]): SessionEvent[] {
  const ev = (type: SessionEvent['type'], payload: Record<string, unknown> = {}): SessionEvent => {
    seq += 1
    return { seq, eventId: `e${seq}`, sessionId, type, timestamp: `2026-09-01T00:00:${String(seq % 60).padStart(2, '0')}.000Z`, payload }
  }
  const out = [ev('SESSION_STARTED')]
  mets.forEach((met, i) => {
    out.push(ev('SET_COMPLETED', { exerciseId: 'squat', met }))
    if (i < mets.length - 1) out.push(ev('REST_SKIPPED'))
  })
  return out
}

describe('levelFor', () => {
  it('starts at level 1, Seedling, with 100 XP to level 2', () => {
    expect(levelFor(0)).toEqual({ level: 1, name: 'Seedling', into: 0, needed: 100, total: 0 })
  })

  it('reaches level 2 at 100 XP and each level asks a little more', () => {
    expect(levelFor(100)).toMatchObject({ level: 2, name: 'Sprout', into: 0 })
    const l2 = levelFor(100).needed
    const l3 = levelFor(100 + l2).needed
    expect(l2).toBeGreaterThan(100)
    expect(l3).toBeGreaterThan(l2)
  })

  it('never runs out of levels', () => {
    const high = levelFor(1_000_000)
    expect(high.level).toBeGreaterThan(20)
    expect(high.name.length).toBeGreaterThan(0)
  })
})

describe('computeXp / sessionXpGain', () => {
  const history = {
    plans: [plan('s1'), plan('s2')],
    results: [result('s1', '2026-09-28T10:00:00.000Z'), result('s2', '2026-09-29T10:00:00.000Z')],
    events: [...sets('s1', [true, false]), ...sets('s2', [true, true])],
  }

  it('awards sets, met sets and the finish, plus the weekly-goal bonus once', () => {
    const xp = computeXp(history, 2)
    const s1 = 2 * XP_RULES.perSet + 1 * XP_RULES.perMetSet + XP_RULES.perWorkout
    const s2 = 2 * XP_RULES.perSet + 2 * XP_RULES.perMetSet + XP_RULES.perWorkout + XP_RULES.weeklyGoal
    expect(xp.bySession.get('s1')).toEqual({ gained: s1, goalMet: false })
    expect(xp.bySession.get('s2')).toEqual({ gained: s2, goalMet: true })
    expect(xp.total).toBe(s1 + s2)
  })

  it('reports the gain and level change for one session', () => {
    const gain = sessionXpGain(history, 2, 's2')
    expect(gain.gained).toBe(computeXp(history, 2).bySession.get('s2')!.gained)
    expect(gain.from.total).toBe(computeXp(history, 2).bySession.get('s1')!.gained)
    expect(gain.to.total).toBe(computeXp(history, 2).total)
    expect(gain.leveledUp).toBe(gain.to.level > gain.from.level)
    expect(gain.goalMet).toBe(true)
  })

  it('never decreases: a later session only adds', () => {
    const one = computeXp({ ...history, results: [history.results[0]] }, 2).total
    expect(computeXp(history, 2).total).toBeGreaterThan(one)
  })

  it('an unknown session gains nothing', () => {
    expect(sessionXpGain(history, 2, 'nope').gained).toBe(0)
  })
})
