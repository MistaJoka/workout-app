import { describe, expect, it } from 'vitest'
import { liveSetCarrots } from './carrots'
import type { SessionEvent, SessionPlan } from '../session/types'

const plan: SessionPlan = {
  id: 's',
  templateId: 't',
  templateVersion: 1,
  packId: 'p',
  ruleVersion: 'v0',
  createdAt: '2026-10-05T00:00:00.000Z',
  exercises: [{ exerciseId: 'ex1', exerciseVersion: 1, name: 'One', sets: 3, reps: 10, restSeconds: 60, order: 0 }],
  adaptations: [],
  reproducibilityHash: 'h',
}

let n = 0
const ev = (type: SessionEvent['type']): SessionEvent => ({
  eventId: `e${n++}`,
  sessionId: 's',
  type,
  timestamp: `2026-10-05T00:00:${String(n).padStart(2, '0')}.000Z`,
  payload: { exerciseId: 'ex1', met: true },
})

describe('liveSetCarrots: carrots a workout in progress has earned so far', () => {
  it('one per completed set (a set logged mid-rest is a stray tap and earns nothing)', () => {
    expect(liveSetCarrots(plan, [ev('SESSION_STARTED'), ev('SET_COMPLETED'), ev('REST_SKIPPED'), ev('SET_COMPLETED')])).toBe(2)
  })
  it('an undone set takes its carrot back', () => {
    expect(liveSetCarrots(plan, [ev('SESSION_STARTED'), ev('SET_COMPLETED'), ev('REST_SKIPPED'), ev('SET_COMPLETED'), ev('SET_UNDONE')])).toBe(1)
  })
  it('nothing done yet is zero', () => {
    expect(liveSetCarrots(plan, [ev('SESSION_STARTED')])).toBe(0)
  })
})
