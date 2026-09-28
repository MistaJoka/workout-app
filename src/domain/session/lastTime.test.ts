import { describe, expect, it } from 'vitest'
import { summarizeLastTime } from './lastTime'
import type { SessionEvent, SessionPlan, SessionResult } from './types'

function plan(id: string, exercises: Partial<SessionPlan['exercises'][number]>[]): SessionPlan {
  return {
    id,
    templateId: 't',
    templateVersion: 1,
    packId: 'p',
    ruleVersion: 'v1',
    createdAt: '2026-09-18T00:00:00.000Z',
    exercises: exercises.map((e, order) => ({
      exerciseId: 'ex',
      exerciseVersion: 1,
      name: 'Ex',
      sets: 2,
      restSeconds: 45,
      order,
      ...e,
    })),
    adaptations: [],
    reproducibilityHash: 'h',
  }
}

function result(sessionId: string, endedAt: string, status: SessionResult['status'] = 'COMPLETED'): SessionResult {
  return { sessionId, planId: sessionId, status, startedAt: endedAt, endedAt, totalSetsCompleted: 2, totalSetsPlanned: 2 }
}

function set(sessionId: string, seq: number, payload: Record<string, unknown>): SessionEvent {
  return { seq, eventId: `${sessionId}-${seq}`, sessionId, type: 'SET_COMPLETED', timestamp: '2026-09-18T00:00:00.000Z', payload }
}

describe('summarizeLastTime', () => {
  it('returns null when no completed session included the exercise', () => {
    expect(summarizeLastTime([], [], [], 'ex')).toBeNull()
    const plans = [plan('s1', [{ exerciseId: 'other', reps: 10 }])]
    expect(summarizeLastTime(plans, [result('s1', '2026-09-18T01:00:00.000Z')], [set('s1', 1, { exerciseId: 'other', met: true })], 'ex')).toBeNull()
  })

  it('collapses an all-met reps session into one trailing check', () => {
    const plans = [plan('s1', [{ exerciseId: 'ex', reps: 10 }])]
    const events = [set('s1', 1, { exerciseId: 'ex', met: true }), set('s1', 2, { exerciseId: 'ex', met: true })]
    expect(summarizeLastTime(plans, [result('s1', '2026-09-18T01:00:00.000Z')], events, 'ex')).toBe('Last time: 10 · 10 ✓')
  })

  it('marks each set when any set was missed', () => {
    const plans = [plan('s1', [{ exerciseId: 'ex', reps: 10 }])]
    const events = [set('s1', 1, { exerciseId: 'ex', met: true }), set('s1', 2, { exerciseId: 'ex', met: false })]
    expect(summarizeLastTime(plans, [result('s1', '2026-09-18T01:00:00.000Z')], events, 'ex')).toBe('Last time: 10 ✓ · 10 ✗')
  })

  it('shows seconds, without marks, for time-based sets', () => {
    const plans = [plan('s1', [{ exerciseId: 'ex', timeSeconds: 20 }])]
    const events = [set('s1', 1, { exerciseId: 'ex' }), set('s1', 2, { exerciseId: 'ex' })]
    expect(summarizeLastTime(plans, [result('s1', '2026-09-18T01:00:00.000Z')], events, 'ex')).toBe('Last time: 20s · 20s')
  })

  it('uses the most recent session that actually performed the exercise, ignoring newer ones that did not reach it', () => {
    const plans = [plan('old', [{ exerciseId: 'ex', reps: 8 }]), plan('new', [{ exerciseId: 'ex', reps: 12 }])]
    const results = [result('old', '2026-09-17T01:00:00.000Z'), result('new', '2026-09-18T01:00:00.000Z', 'COMPLETED_SHORTENED')]
    const events = [set('old', 1, { exerciseId: 'ex', met: true })]
    expect(summarizeLastTime(plans, results, events, 'ex')).toBe('Last time: 8 ✓')
  })

  it('prefers the newest session by endedAt regardless of array order', () => {
    const plans = [plan('a', [{ exerciseId: 'ex', reps: 8 }]), plan('b', [{ exerciseId: 'ex', reps: 12 }])]
    const results = [result('b', '2026-09-18T01:00:00.000Z'), result('a', '2026-09-17T01:00:00.000Z')]
    const events = [set('a', 1, { exerciseId: 'ex', met: true }), set('b', 2, { exerciseId: 'ex', met: false })]
    expect(summarizeLastTime(plans, results, events, 'ex')).toBe('Last time: 12 ✗')
  })
})

describe('summarizeLastTime with stray sets', () => {
  it('ignores a stray tap stored mid-rest', () => {
    const ev = (seq: number, type: SessionEvent['type'], payload: Record<string, unknown> = {}): SessionEvent => ({
      seq,
      eventId: `s1-${seq}`,
      sessionId: 's1',
      type,
      timestamp: `2026-09-18T00:00:${String(seq).padStart(2, '0')}.000Z`,
      payload,
    })
    const summary = summarizeLastTime(
      [plan('s1', [{ reps: 10 }])],
      [result('s1', '2026-09-18T10:00:00.000Z')],
      [
        ev(1, 'SESSION_STARTED'),
        ev(2, 'SET_COMPLETED', { exerciseId: 'ex', met: true }),
        ev(3, 'SET_COMPLETED', { exerciseId: 'ex', met: false }),
        ev(4, 'REST_SKIPPED'),
        ev(5, 'SET_COMPLETED', { exerciseId: 'ex', met: true }),
      ],
      'ex'
    )
    expect(summary).toBe('Last time: 10 · 10 ✓')
  })
})
