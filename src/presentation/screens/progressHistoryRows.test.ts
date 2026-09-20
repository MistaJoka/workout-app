import { describe, expect, it, vi } from 'vitest'
import { buildHistoryRows } from './progressHistoryRows'
import type { SessionPlan, SessionResult } from '../../domain/session/types'

const plan = (id: string, templateId: string): SessionPlan =>
  ({ id, templateId, exercises: [], createdAt: '2026-09-01T00:00:00Z' }) as unknown as SessionPlan

const result = (sessionId: string, planId: string, endedAt: string): SessionResult =>
  ({ sessionId, planId, endedAt, startedAt: endedAt, totalSetsCompleted: 1 }) as unknown as SessionResult

describe('buildHistoryRows', () => {
  it('names each row from its plan template, newest first, without re-reading plans', async () => {
    const plans = [plan('p1', 'tA'), plan('p2', 'tB'), plan('p3', 'tA')]
    const results = [
      result('s1', 'p1', '2026-09-01T10:00:00Z'),
      result('s2', 'p2', '2026-09-03T10:00:00Z'),
      result('s3', 'p3', '2026-09-02T10:00:00Z'),
    ]
    const getTemplate = vi.fn(async (id: string) => (id === 'tA' ? { name: 'Full-Body A' } : { name: 'Full-Body B' }))

    const rows = await buildHistoryRows(plans, results, getTemplate)

    expect(rows.map((r) => [r.sessionId, r.workoutName])).toEqual([
      ['s2', 'Full-Body B'],
      ['s3', 'Full-Body A'],
      ['s1', 'Full-Body A'],
    ])
    // one template lookup per distinct template, not per session
    expect(getTemplate).toHaveBeenCalledTimes(2)
  })

  it('falls back to "Workout" when the plan or template is missing', async () => {
    const rows = await buildHistoryRows(
      [plan('p1', 'gone')],
      [result('s1', 'p1', '2026-09-01T10:00:00Z'), result('s2', 'orphan', '2026-09-02T10:00:00Z')],
      async () => undefined
    )
    expect(rows.map((r) => r.workoutName)).toEqual(['Workout', 'Workout'])
  })
})
