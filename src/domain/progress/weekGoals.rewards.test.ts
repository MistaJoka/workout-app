import { describe, expect, it } from 'vitest'
import { buildWeekGoals } from './weekGoals'
import { computeXp } from './xp'
import { evaluateAchievements } from './achievements'
import { goalBlooms } from './goalBloom'
import { calculateWeekStreak } from './stats'
import { earnedCarrots } from '../rewards/carrots'
import { bossDefeats } from '../game/bosses'
import type { SessionEvent, SessionPlan, SessionResult } from '../session/types'

// The bug this guards: rewards are derived from history, so scoring past
// weeks with today's goal let a schedule change take earned rewards back.

function plan(id: string, weeklyGoal?: number): SessionPlan {
  return {
    id,
    templateId: 't',
    templateVersion: 1,
    packId: 'p',
    ruleVersion: 'v1',
    createdAt: '2026-09-01T00:00:00.000Z',
    exercises: [{ exerciseId: 'squat', exerciseVersion: 1, name: 'Squat', sets: 6, reps: 10, restSeconds: 45, order: 0 }],
    adaptations: [],
    reproducibilityHash: 'h',
    ...(weeklyGoal != null ? { weeklyGoal } : {}),
  }
}
function result(id: string, endedAt: string): SessionResult {
  return { sessionId: id, planId: id, status: 'COMPLETED', startedAt: endedAt, endedAt, totalSetsCompleted: 6, totalSetsPlanned: 6 }
}
let seq = 0
function sets(sessionId: string, at: string): SessionEvent[] {
  const ev = (type: SessionEvent['type'], payload: Record<string, unknown> = {}): SessionEvent => {
    seq += 1
    return { seq, eventId: `e${seq}`, sessionId, type, timestamp: at, payload }
  }
  const out = [ev('SESSION_STARTED')]
  for (let i = 0; i < 6; i++) {
    out.push(ev('SET_COMPLETED', { exerciseId: 'squat', met: true }))
    if (i < 5) out.push(ev('REST_SKIPPED'))
  }
  return out
}
const at = (m: number, d: number) => new Date(2026, m - 1, d, 10).toISOString()

// Last week (Mon Sep 21): two workouts under a goal of 2 -- goal met.
// Then she adds a third planned day; this week starts under goal 3.
const history = {
  plans: [plan('a', 2), plan('b', 2), plan('c', 3)],
  results: [result('a', at(9, 22)), result('b', at(9, 24)), result('c', at(9, 29))],
  events: [...sets('a', at(9, 22)), ...sets('b', at(9, 24)), ...sets('c', at(9, 29))],
}
const perWeek = buildWeekGoals({ plans: history.plans, results: history.results, legacyGoal: 2, currentGoal: 3 })

describe('a raised goal never re-scores a past week', () => {
  it('keeps the weekly-goal carrots and XP from last week', () => {
    expect(earnedCarrots(history, perWeek).bySession.find((s) => s.sessionId === 'b')!.sources.map((s) => s.label)).toContain(
      "This week's goal met"
    )
    expect(computeXp(history, perWeek).bySession.get('b')!.goalMet).toBe(true)
    // The old behaviour, for contrast: today's goal (3) erases it.
    expect(computeXp(history, 3).bySession.get('b')!.goalMet).toBe(false)
  })

  it("keeps last week's goal bloom, badge, boss win and streak", () => {
    expect(goalBlooms(history.results, perWeek).map((b) => b.sessionId)).toEqual(['b'])
    expect(evaluateAchievements(history, perWeek).find((a) => a.id === 'weekly-goal')!.sessionId).toBe('b')
    expect(bossDefeats(history, perWeek).map((d) => d.sessionId)).toContain('b')
    expect(calculateWeekStreak(history.results, perWeek, new Date(2026, 9, 2))).toBe(1)
  })
})
