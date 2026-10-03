import { describe, expect, it } from 'vitest'
import { buildWeekGoals, goalForWeek, mondayKey } from './weekGoals'
import type { SessionPlan, SessionResult } from '../session/types'

function plan(id: string, weeklyGoal?: number): SessionPlan {
  return {
    id,
    templateId: 't',
    templateVersion: 1,
    packId: 'p',
    ruleVersion: 'v1',
    createdAt: '2026-09-01T00:00:00.000Z',
    exercises: [],
    adaptations: [],
    reproducibilityHash: 'h',
    ...(weeklyGoal != null ? { weeklyGoal } : {}),
  }
}
function result(id: string, endedAt: string): SessionResult {
  return { sessionId: id, planId: id, status: 'COMPLETED', startedAt: endedAt, endedAt, totalSetsCompleted: 1, totalSetsPlanned: 1 }
}
// Local-time dates (week math is local, Monday-start).
const at = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h).toISOString()

describe('goalForWeek', () => {
  it('a plain number is the goal for every week', () => {
    expect(goalForWeek(3, new Date())).toBe(3)
  })
  it('a resolver is asked for the week of the given date', () => {
    expect(goalForWeek((d) => d.getDate(), new Date(2026, 9, 7))).toBe(7)
  })
})

describe('mondayKey', () => {
  it('maps every day of a Monday-start week to the same key', () => {
    expect(mondayKey(new Date(2026, 8, 28))).toBe(mondayKey(new Date(2026, 9, 4, 23)))
    expect(mondayKey(new Date(2026, 8, 27))).not.toBe(mondayKey(new Date(2026, 8, 28)))
  })
})

describe('buildWeekGoals: a week keeps the goal it started with', () => {
  it("uses the goal snapshotted on the week's first workout", () => {
    const goals = buildWeekGoals({
      plans: [plan('a', 2), plan('b', 3)],
      // a: Tue Sep 29 (goal 2), b: Thu Oct 1 after a schedule change (goal 3)
      results: [result('a', at(2026, 9, 29)), result('b', at(2026, 10, 1))],
      legacyGoal: 2,
      currentGoal: 3,
    })
    expect(goals(new Date(2026, 9, 1))).toBe(2)
  })

  it('a week whose workouts predate snapshots uses the frozen legacy goal', () => {
    const goals = buildWeekGoals({ plans: [plan('a')], results: [result('a', at(2026, 9, 1))], legacyGoal: 2, currentGoal: 4 })
    expect(goals(new Date(2026, 8, 2))).toBe(2)
  })

  it('a week with no workouts yet follows the current schedule', () => {
    const goals = buildWeekGoals({ plans: [], results: [], legacyGoal: 2, currentGoal: 4 })
    expect(goals(new Date(2026, 9, 7))).toBe(4)
  })

  it('ignores a snapshot from a later workout in the same week when the first has one', () => {
    const goals = buildWeekGoals({
      plans: [plan('late', 5), plan('early', 2)],
      results: [result('late', at(2026, 10, 2)), result('early', at(2026, 9, 29))],
      legacyGoal: 1,
      currentGoal: 5,
    })
    expect(goals(new Date(2026, 8, 30))).toBe(2)
  })
})
