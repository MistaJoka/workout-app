import { describe, expect, it } from 'vitest'
import { CARROT_RULES, carrotsForSession, earnedCarrots } from './carrots'
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

function result(id: string, endedAt: string, completed: number, planned: number): SessionResult {
  return {
    sessionId: id,
    planId: id,
    status: completed < planned ? 'COMPLETED_SHORTENED' : 'COMPLETED',
    startedAt: endedAt,
    endedAt,
    totalSetsCompleted: completed,
    totalSetsPlanned: planned,
  }
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

describe('earnedCarrots', () => {
  it('pays a flat workout bonus plus one carrot per counted set', () => {
    const history = {
      plans: [plan('s1', 2)],
      results: [result('s1', '2026-09-28T10:00:00.000Z', 2, 2)],
      events: sets('s1', [true, true]),
    }
    const earned = earnedCarrots(history, 0)
    // Every planned set landed, met, so the perfect bonus also fires here.
    expect(earned.total).toBe(CARROT_RULES.perWorkout + 2 * CARROT_RULES.perSet + CARROT_RULES.perfectBonus)
    expect(earned.bySession).toHaveLength(1)
    expect(earned.bySession[0].sources.map((s) => s.label)).toEqual(['Workout finished', '2 sets', 'Perfect workout'])
  })

  it('pays per counted set even when a set fell short (missed sets still count toward the set bonus)', () => {
    const history = {
      plans: [plan('s1', 2)],
      results: [result('s1', '2026-09-28T10:00:00.000Z', 2, 2)],
      events: sets('s1', [true, false]),
    }
    const earned = earnedCarrots(history, 0)
    // Not perfect (one set missed), so no perfect bonus -- just workout + 2 sets.
    expect(earned.total).toBe(CARROT_RULES.perWorkout + 2 * CARROT_RULES.perSet)
    expect(earned.bySession[0].sources.map((s) => s.label)).toEqual(['Workout finished', '2 sets'])
  })

  it('awards the perfect bonus only when every planned set landed, met', () => {
    const history = {
      plans: [plan('s1', 3)],
      results: [result('s1', '2026-09-28T10:00:00.000Z', 2, 3)],
      // Ended early: only 2 of 3 planned sets logged.
      events: sets('s1', [true, true]),
    }
    const earned = earnedCarrots(history, 0)
    expect(earned.bySession[0].sources.some((s) => s.label === 'Perfect workout')).toBe(false)
  })

  it('awards the weekly-goal bonus once, on the session that reaches the goal', () => {
    const history = {
      plans: [plan('s1'), plan('s2'), plan('s3')],
      results: [
        result('s1', '2026-09-28T10:00:00.000Z', 2, 2), // Monday
        result('s2', '2026-09-29T10:00:00.000Z', 2, 2), // Tuesday -- 2nd this week, goal met
        result('s3', '2026-09-30T10:00:00.000Z', 2, 2), // Wednesday -- 3rd, bonus already paid
      ],
      events: [...sets('s1', [true, true]), ...sets('s2', [true, true]), ...sets('s3', [true, true])],
    }
    const earned = earnedCarrots(history, 2)
    const bonusSessions = earned.bySession.filter((s) => s.sources.some((src) => src.label === "This week's goal met"))
    expect(bonusSessions.map((s) => s.sessionId)).toEqual(['s2'])
    expect(bonusSessions[0].total).toBe(
      CARROT_RULES.perWorkout + 2 * CARROT_RULES.perSet + CARROT_RULES.perfectBonus + CARROT_RULES.weeklyGoalBonus
    )
  })

  it('a weeklyGoal of 0 never pays the weekly-goal bonus', () => {
    const history = {
      plans: [plan('s1')],
      results: [result('s1', '2026-09-28T10:00:00.000Z', 2, 2)],
      events: sets('s1', [true, true]),
    }
    expect(earnedCarrots(history, 0).bySession[0].sources.some((s) => s.label === "This week's goal met")).toBe(false)
  })

  it('extraCarrotSources add to the total without appearing in any session breakdown', () => {
    const history = {
      plans: [plan('s1')],
      results: [result('s1', '2026-09-28T10:00:00.000Z', 2, 2)],
      events: sets('s1', [true, true]),
    }
    const withoutExtra = earnedCarrots(history, 0)
    const extra = [{ id: 'boss-1', at: '2026-09-28T12:00:00.000Z', amount: 7, label: 'Boss defeated' }]
    const withExtra = earnedCarrots(history, 0, extra)
    expect(withExtra.total).toBe(withoutExtra.total + 7)
    expect(withExtra.bySession).toEqual(withoutExtra.bySession)
    expect(withExtra.extra).toEqual(extra)
  })

  it('an empty history earns nothing', () => {
    expect(earnedCarrots({ plans: [], results: [], events: [] }, 2)).toEqual({ total: 0, bySession: [], extra: [] })
  })
})

describe('carrotsForSession', () => {
  const history = {
    plans: [plan('s1'), plan('s2')],
    results: [result('s1', '2026-09-28T10:00:00.000Z', 2, 2), result('s2', '2026-09-29T10:00:00.000Z', 2, 2)],
    events: [...sets('s1', [true, true]), ...sets('s2', [true, true])],
  }

  it('returns the one session asked for', () => {
    expect(carrotsForSession(history, 0, 's2')?.sessionId).toBe('s2')
  })

  it('returns null for a session not in history', () => {
    expect(carrotsForSession(history, 0, 'nope')).toBeNull()
  })
})
