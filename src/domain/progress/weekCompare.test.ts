import { describe, expect, it } from 'vitest'
import { compareWeeks, highlightLabel, type WeekCompareHistory } from './weekCompare'
import type { SessionEvent, SessionPlan, SessionResult } from '../session/types'

// Local-time instants so week boundaries match the user's calendar, same
// convention as recap.test.ts.
const local = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).toISOString()

function plan(id: string, opts: { reps?: number; holdSeconds?: number } = {}): SessionPlan {
  const exercises: SessionPlan['exercises'] = [
    { exerciseId: 'squat', exerciseVersion: 1, name: 'Squat', sets: 2, reps: opts.reps ?? 10, restSeconds: 30, order: 0 },
  ]
  if (opts.holdSeconds != null) {
    exercises.push({ exerciseId: 'plank', exerciseVersion: 1, name: 'Plank', sets: 1, timeSeconds: opts.holdSeconds, restSeconds: 30, order: 1 })
  }
  return {
    id,
    templateId: 't',
    templateVersion: 1,
    packId: 'p',
    ruleVersion: 'v1',
    createdAt: '2026-09-01T00:00:00.000Z',
    exercises,
    adaptations: [],
    reproducibilityHash: 'h',
  }
}

function result(sessionId: string, endedAt: string, setsCompleted: number, planId = sessionId): SessionResult {
  return { sessionId, planId, status: 'COMPLETED', startedAt: endedAt, endedAt, totalSetsCompleted: setsCompleted, totalSetsPlanned: setsCompleted }
}

// No SESSION_STARTED event: effectiveSetSlots (appliedEvents.ts) fills the
// plan's slots in document order for "hand-built" history like this, so a
// bare list of SET_COMPLETED events is enough — the same technique
// e2e/meadow.spec.ts and this feature's own e2e spec use for IndexedDB seeds.
function completedSets(sessionId: string, count: number, reps = 10): SessionEvent[] {
  return Array.from({ length: count }, (_, i) => ({
    eventId: `${sessionId}-${i}`,
    sessionId,
    type: 'SET_COMPLETED' as const,
    timestamp: '2026-09-01T00:00:00.000Z',
    payload: { exerciseId: 'squat', met: true, reps },
  }))
}

function holdSet(sessionId: string, at: string): SessionEvent {
  return { eventId: `${sessionId}-hold`, sessionId, type: 'SET_COMPLETED', timestamp: at, payload: { met: true } }
}

function history(plans: SessionPlan[], results: SessionResult[], events: SessionEvent[]): WeekCompareHistory {
  return { plans, results, events }
}

function labels(cmp: { highlights: { prefix: string; value?: number; text: string }[] }): string[] {
  return cmp.highlights.map(highlightLabel)
}

describe('compareWeeks', () => {
  const monday = new Date(2026, 9, 5, 12) // Monday Oct 5, 2026 (recap.test.ts: Oct 4 2026 is Sunday)

  it('with no history at all, is calm and has no highlights', () => {
    const cmp = compareWeeks(history([], [], []), 2, monday)
    expect(cmp.current).toEqual({ workouts: 0, sets: 0, minutes: 0, xp: 0, longestHoldSeconds: 0, totalReps: 0 })
    expect(cmp.highlights).toEqual([])
    expect(cmp.fallback).toBe('Rest weeks count too.')
  })

  it('a new weekly-sets record outranks a plain delta', () => {
    const p = plan('p1')
    const cmp = compareWeeks(
      history(
        [p],
        [result('prev', local(2026, 9, 29), 2, 'p1'), result('cur', local(2026, 10, 6), 6, 'p1')],
        [...completedSets('prev', 2), ...completedSets('cur', 2)]
      ),
      2,
      monday
    )
    expect(cmp.current.sets).toBe(6)
    expect(cmp.previous.sets).toBe(2)
    expect(labels(cmp)[0]).toBe('Most sets in a week!')
    expect(labels(cmp)).not.toContain('+4 sets vs last week')
  })

  it('a plain sets gain (not a record) reads as "+N sets vs last week"', () => {
    const p = plan('p1')
    // An earlier week with more sets than either compared week, so this
    // week's gain is real but not an all-time record.
    const cmp = compareWeeks(
      history(
        [p],
        [result('old', local(2026, 9, 1), 20, 'p1'), result('prev', local(2026, 9, 29), 2, 'p1'), result('cur', local(2026, 10, 6), 4, 'p1')],
        [...completedSets('old', 2), ...completedSets('prev', 2), ...completedSets('cur', 2)]
      ),
      2,
      monday
    )
    expect(labels(cmp)).toContain('+2 sets vs last week')
    expect(labels(cmp)).not.toContain('Most sets in a week!')
  })

  it('more reps this week than last becomes a "+N reps" highlight', () => {
    const p = plan('p1')
    const cmp = compareWeeks(
      history(
        [p],
        [result('old', local(2026, 9, 1), 20, 'p1'), result('prev', local(2026, 9, 29), 2, 'p1'), result('cur', local(2026, 10, 6), 2, 'p1')],
        [...completedSets('old', 2, 10), ...completedSets('prev', 2, 8), ...completedSets('cur', 2, 12)]
      ),
      2,
      monday
    )
    expect(cmp.current.totalReps).toBe(24)
    expect(cmp.previous.totalReps).toBe(16)
    expect(labels(cmp)).toContain('+8 reps vs last week')
  })

  it('a new longest-hold beats the prior best and is called out', () => {
    const shortHold = plan('short', { holdSeconds: 20 })
    const longHold = plan('long', { holdSeconds: 45 })
    const cmp = compareWeeks(
      history(
        [shortHold, longHold],
        [result('prev', local(2026, 9, 29), 3, 'short'), result('cur', local(2026, 10, 6), 3, 'long')],
        [...completedSets('prev', 2), holdSet('prev', local(2026, 9, 29)), ...completedSets('cur', 2), holdSet('cur', local(2026, 10, 6))]
      ),
      2,
      monday
    )
    expect(cmp.current.longestHoldSeconds).toBe(45)
    expect(labels(cmp)).toContain('Longest hold yet: 45s')
  })

  it('repeating an old hold is not a new best', () => {
    const p = plan('p1', { holdSeconds: 30 })
    const cmp = compareWeeks(
      history(
        [p],
        [result('old', local(2026, 9, 1), 3, 'p1'), result('cur', local(2026, 10, 6), 3, 'p1')],
        [...completedSets('old', 2), holdSet('old', local(2026, 9, 1)), ...completedSets('cur', 2), holdSet('cur', local(2026, 10, 6))]
      ),
      2,
      monday
    )
    expect(cmp.current.longestHoldSeconds).toBe(30)
    expect(labels(cmp).some((h) => h.startsWith('Longest hold'))).toBe(false)
  })

  it('a quieter week than last is shown calmly, never as a highlight or loss', () => {
    const p = plan('p1')
    const cmp = compareWeeks(history([p], [result('prev', local(2026, 9, 29), 6, 'p1')], [...completedSets('prev', 2)]), 2, monday)
    expect(cmp.current.workouts).toBe(0)
    expect(cmp.highlights).toEqual([])
    expect(cmp.fallback).toBe('Rest weeks count too.')
  })

  it('a slower-but-still-active week gets the non-zero calm fallback, not the rest-week one', () => {
    const p = plan('p1')
    const cmp = compareWeeks(
      history(
        [p],
        [result('prev', local(2026, 9, 29), 4, 'p1'), result('cur', local(2026, 10, 6), 4, 'p1')],
        [...completedSets('prev', 2, 10), ...completedSets('cur', 2, 10)]
      ),
      2,
      monday
    )
    expect(cmp.highlights).toEqual([])
    expect(cmp.fallback).toBe('Every week adds to your story.')
  })

  it('caps highlights at 3, most impressive (the all-time records) first', () => {
    const squatOnly = plan('sq')
    const withHold = plan('hp', { holdSeconds: 50 })
    const cmp = compareWeeks(
      history(
        [squatOnly, withHold],
        [
          result('prev', local(2026, 9, 29), 1, 'sq'),
          result('cur1', local(2026, 10, 6), 3, 'hp'),
          result('cur2', local(2026, 10, 7), 2, 'sq'),
        ],
        [...completedSets('prev', 1, 5), ...completedSets('cur1', 2, 20), holdSet('cur1', local(2026, 10, 6)), ...completedSets('cur2', 2, 15)]
      ),
      2,
      monday
    )
    expect(cmp.current.workouts).toBe(2)
    expect(cmp.highlights.length).toBe(3)
    expect(labels(cmp)).toEqual(['Most workouts in a week!', 'Most sets in a week!', 'Longest hold yet: 50s'])
  })
})
