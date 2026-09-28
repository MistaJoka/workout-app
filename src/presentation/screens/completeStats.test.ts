import { describe, expect, it } from 'vitest'
import { completeStats } from './completeStats'
import type { SessionEvent, SessionPlan, SessionResult } from '../../domain/session/types'

const plan: SessionPlan = {
  id: 's',
  templateId: 't',
  templateVersion: 1,
  packId: 'p',
  ruleVersion: 'r',
  createdAt: '2026-09-28T10:00:00.000Z',
  exercises: [
    { exerciseId: 'a', exerciseVersion: 1, name: 'A', sets: 2, reps: 10, restSeconds: 30, order: 0 },
    { exerciseId: 'b', exerciseVersion: 1, name: 'B', sets: 1, reps: 10, restSeconds: 30, order: 1 },
  ],
  adaptations: [],
  reproducibilityHash: 'h',
}

let seq = 0
const ev = (type: SessionEvent['type'], exerciseId?: string): SessionEvent => ({
  seq: ++seq,
  eventId: `e${seq}`,
  sessionId: 's',
  type,
  timestamp: `2026-09-28T10:0${seq}:00.000Z`,
  payload: exerciseId ? { exerciseId, met: true } : {},
})

const result = (status: SessionResult['status'], minutes: number, sets: number): SessionResult => ({
  sessionId: 's',
  planId: 's',
  status,
  startedAt: '2026-09-28T10:00:00.000Z',
  endedAt: new Date(Date.parse('2026-09-28T10:00:00.000Z') + minutes * 60_000).toISOString(),
  totalSetsCompleted: sets,
  totalSetsPlanned: 3,
})

describe('completeStats', () => {
  it('counts minutes, sets done and the moves actually worked', () => {
    seq = 0
    const events = [
      ev('SESSION_STARTED'),
      ev('SET_COMPLETED', 'a'),
      ev('REST_SKIPPED'),
      ev('SET_COMPLETED', 'a'),
      ev('REST_SKIPPED'),
      ev('SET_COMPLETED', 'b'),
    ]
    expect(completeStats(plan, result('COMPLETED', 14, 3), events)).toEqual({ minutes: 14, sets: 3, moves: 2 })
  })

  it('leaves out moves an early end never reached, and never shows 0 minutes', () => {
    seq = 0
    const events = [ev('SESSION_STARTED'), ev('SET_COMPLETED', 'a'), ev('SESSION_COMPLETED_SHORTENED')]
    expect(completeStats(plan, result('COMPLETED_SHORTENED', 0, 1), events)).toEqual({ minutes: 1, sets: 1, moves: 1 })
  })
})
