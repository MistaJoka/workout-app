import { describe, expect, it } from 'vitest'
import { flowStatus, flowTier, isFlowMilestone } from './flow'
import type { SessionEvent, SessionPlan } from './types'

const plan: SessionPlan = {
  id: 's1',
  templateId: 't',
  templateVersion: 1,
  packId: 'p',
  ruleVersion: 'v1',
  createdAt: '2026-09-30T10:00:00.000Z',
  exercises: [
    { exerciseId: 'squat', exerciseVersion: 1, name: 'Squat', sets: 2, reps: 10, restSeconds: 45, order: 0 },
    { exerciseId: 'pushup', exerciseVersion: 1, name: 'Push-Up', sets: 2, reps: 8, restSeconds: 45, order: 1 },
    { exerciseId: 'plank', exerciseVersion: 1, name: 'Plank', sets: 1, timeSeconds: 20, restSeconds: 45, order: 2 },
  ],
  adaptations: [],
  reproducibilityHash: 'h',
}

let seq = 0
function ev(type: SessionEvent['type'], payload: Record<string, unknown> = {}): SessionEvent {
  seq += 1
  return { seq, eventId: `e${seq}`, sessionId: 's1', type, timestamp: `2026-09-30T10:00:${String(seq).padStart(2, '0')}.000Z`, payload }
}

describe('flowStatus', () => {
  it('is zero with no sets done', () => {
    expect(flowStatus(plan, [ev('SESSION_STARTED')]).run).toBe(0)
  })

  it('counts consecutive met sets, absent met treated as met', () => {
    const events = [
      ev('SESSION_STARTED'),
      ev('SET_COMPLETED', { exerciseId: 'squat', met: true }),
      ev('REST_SKIPPED'),
      ev('SET_COMPLETED', { exerciseId: 'squat' }), // no met key: counts as met
    ]
    expect(flowStatus(plan, events).run).toBe(2)
  })

  it('resets the run on a miss, quietly (no separate "reset happened" flag)', () => {
    const events = [
      ev('SESSION_STARTED'),
      ev('SET_COMPLETED', { exerciseId: 'squat', met: true }),
      ev('REST_SKIPPED'),
      ev('SET_COMPLETED', { exerciseId: 'squat', met: false, reps: 6 }),
      ev('REST_SKIPPED'),
      ev('SET_COMPLETED', { exerciseId: 'pushup', met: true }),
    ]
    expect(flowStatus(plan, events).run).toBe(1)
  })

  it('ignores a stray mid-rest SET_COMPLETED (not an effective set)', () => {
    const events = [
      ev('SESSION_STARTED'),
      ev('SET_COMPLETED', { exerciseId: 'squat', met: true }),
      ev('SET_COMPLETED', { exerciseId: 'squat', met: false }), // stray, mid-rest: ignored by the machine
    ]
    expect(flowStatus(plan, events).run).toBe(1)
  })

  it('drops an undone set from the run along with its SET_COMPLETED', () => {
    const events = [
      ev('SESSION_STARTED'),
      ev('SET_COMPLETED', { exerciseId: 'squat', met: true }),
      ev('SET_UNDONE'),
    ]
    expect(flowStatus(plan, events).run).toBe(0)
  })

  it('is not perfect until every planned set counted and met', () => {
    const events = [ev('SESSION_STARTED'), ev('SET_COMPLETED', { exerciseId: 'squat', met: true })]
    expect(flowStatus(plan, events).perfect).toBe(false)
  })

  it('is not perfect when a set fell short, even if the workout finished', () => {
    const events = [
      ev('SESSION_STARTED'),
      ev('SET_COMPLETED', { exerciseId: 'squat', met: true }),
      ev('REST_SKIPPED'),
      ev('SET_COMPLETED', { exerciseId: 'squat', met: false, reps: 6 }),
      ev('REST_SKIPPED'),
      ev('SET_COMPLETED', { exerciseId: 'pushup', met: true }),
      ev('REST_SKIPPED'),
      ev('SET_COMPLETED', { exerciseId: 'pushup', met: true }),
      ev('SET_COMPLETED', { exerciseId: 'plank', met: true }),
    ]
    expect(flowStatus(plan, events).perfect).toBe(false)
  })

  it('is not perfect when a move was skipped, even if nothing was missed', () => {
    const events = [
      ev('SESSION_STARTED'),
      ev('SET_COMPLETED', { exerciseId: 'squat', met: true }),
      ev('REST_SKIPPED'),
      ev('SET_COMPLETED', { exerciseId: 'squat', met: true }),
      ev('REST_SKIPPED'),
      ev('EXERCISE_SKIPPED'),
      ev('SET_COMPLETED', { exerciseId: 'plank', met: true }),
    ]
    expect(flowStatus(plan, events).perfect).toBe(false)
  })

  it('is perfect once every planned set counted and all met', () => {
    const events = [
      ev('SESSION_STARTED'),
      ev('SET_COMPLETED', { exerciseId: 'squat', met: true }),
      ev('REST_SKIPPED'),
      ev('SET_COMPLETED', { exerciseId: 'squat', met: true }),
      ev('REST_SKIPPED'),
      ev('SET_COMPLETED', { exerciseId: 'pushup', met: true }),
      ev('REST_SKIPPED'),
      ev('SET_COMPLETED', { exerciseId: 'pushup', met: true }),
      ev('REST_SKIPPED'),
      ev('SET_COMPLETED', { exerciseId: 'plank', met: true }),
    ]
    expect(flowStatus(plan, events).perfect).toBe(true)
    expect(flowStatus(plan, events).run).toBe(5)
  })
})

describe('isFlowMilestone / flowTier', () => {
  it('starts escalating at 3, then 5, 8, 12, 17', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 12, 16, 17].map(isFlowMilestone)).toEqual([
      false,
      false,
      false,
      true,
      false,
      true,
      false,
      false,
      true,
      false,
      true,
      false,
      true,
    ])
  })

  it('tiers up with each milestone passed, zero before the first', () => {
    expect([0, 2, 3, 4, 5, 7, 8, 12, 17]).toBeDefined()
    expect(flowTier(0)).toBe(0)
    expect(flowTier(2)).toBe(0)
    expect(flowTier(3)).toBe(1)
    expect(flowTier(4)).toBe(1)
    expect(flowTier(5)).toBe(2)
    expect(flowTier(8)).toBe(3)
    expect(flowTier(12)).toBe(4)
    expect(flowTier(17)).toBe(5)
  })
})
