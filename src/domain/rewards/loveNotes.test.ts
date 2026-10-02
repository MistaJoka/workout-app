import { describe, expect, it } from 'vitest'
import {
  decideLoveNoteUnlock,
  evaluateLoveNoteUnlock,
  LOVE_NOTE_RULES,
  pickNoteToUnlock,
  sessionsSinceLastUnlock,
  type LoveNoteUnlockContext,
} from './loveNotes'

const baseCtx: LoveNoteUnlockContext = {
  sessionId: 'session-a',
  lockedCount: 1,
  goalMetThisSession: false,
  sessionsSinceLastUnlock: 0,
}

describe('decideLoveNoteUnlock', () => {
  it('never unlocks when nothing is locked, regardless of every other rule', () => {
    expect(decideLoveNoteUnlock({ ...baseCtx, lockedCount: 0, goalMetThisSession: true, sessionsSinceLastUnlock: 99 })).toEqual({
      unlock: false,
    })
  })

  it('is guaranteed once the pity threshold is reached', () => {
    expect(decideLoveNoteUnlock({ ...baseCtx, sessionsSinceLastUnlock: LOVE_NOTE_RULES.pityAfterWorkouts })).toEqual({
      unlock: true,
      reasonCode: 'pity',
    })
    expect(decideLoveNoteUnlock({ ...baseCtx, sessionsSinceLastUnlock: LOVE_NOTE_RULES.pityAfterWorkouts + 5 })).toMatchObject({
      unlock: true,
      reasonCode: 'pity',
    })
  })

  it('is guaranteed on the session that meets the weekly goal, pity aside', () => {
    expect(decideLoveNoteUnlock({ ...baseCtx, goalMetThisSession: true })).toEqual({ unlock: true, reasonCode: 'weeklyGoal' })
  })

  it('pity takes priority over the weekly-goal guarantee when both apply', () => {
    expect(
      decideLoveNoteUnlock({ ...baseCtx, goalMetThisSession: true, sessionsSinceLastUnlock: LOVE_NOTE_RULES.pityAfterWorkouts })
    ).toEqual({ unlock: true, reasonCode: 'pity' })
  })

  it('otherwise falls to a deterministic per-session roll, never re-rolling', () => {
    const a = decideLoveNoteUnlock(baseCtx)
    const b = decideLoveNoteUnlock(baseCtx)
    expect(a).toEqual(b)
    if (a.unlock) expect(a.reasonCode).toBe('chance')
  })

  it('different session ids can land on different sides of the chance roll', () => {
    const outcomes = new Set(
      Array.from({ length: 50 }, (_, i) => decideLoveNoteUnlock({ ...baseCtx, sessionId: `session-${i}` }).unlock)
    )
    // Over 50 distinct ids at a 40% chance, both outcomes should appear --
    // this isn't a fixed answer regardless of which session asks.
    expect(outcomes.size).toBe(2)
  })

  it('a session id deterministically rolling true unlocks every time it is re-evaluated', () => {
    const trueId = Array.from({ length: 50 }, (_, i) => `session-${i}`).find(
      (id) => decideLoveNoteUnlock({ ...baseCtx, sessionId: id }).unlock
    )
    expect(trueId).toBeDefined()
    for (let i = 0; i < 3; i++) {
      expect(decideLoveNoteUnlock({ ...baseCtx, sessionId: trueId! })).toEqual({ unlock: true, reasonCode: 'chance' })
    }
  })
})

describe('pickNoteToUnlock', () => {
  it('returns null when nothing is locked', () => {
    expect(pickNoteToUnlock([])).toBeNull()
  })

  it('picks the oldest note by createdAt (FIFO, his writing order)', () => {
    const locked = [
      { id: 'c', createdAt: '2026-09-03T00:00:00.000Z' },
      { id: 'a', createdAt: '2026-09-01T00:00:00.000Z' },
      { id: 'b', createdAt: '2026-09-02T00:00:00.000Z' },
    ]
    expect(pickNoteToUnlock(locked)).toBe('a')
  })

  it('breaks a createdAt tie by id, for a total order', () => {
    const locked = [
      { id: 'z', createdAt: '2026-09-01T00:00:00.000Z' },
      { id: 'a', createdAt: '2026-09-01T00:00:00.000Z' },
    ]
    expect(pickNoteToUnlock(locked)).toBe('a')
  })
})

describe('sessionsSinceLastUnlock', () => {
  const ended = ['2026-09-01T00:00:00.000Z', '2026-09-02T00:00:00.000Z', '2026-09-03T00:00:00.000Z', '2026-09-05T00:00:00.000Z']

  it('counts every prior session when nothing has ever unlocked', () => {
    expect(sessionsSinceLastUnlock(ended, null, '2026-09-05T00:00:00.000Z')).toBe(3)
  })

  it('only counts sessions strictly after the last unlock and strictly before this one', () => {
    expect(sessionsSinceLastUnlock(ended, '2026-09-02T00:00:00.000Z', '2026-09-05T00:00:00.000Z')).toBe(1)
  })

  it('is zero right after an unlock, with no sessions in between', () => {
    expect(sessionsSinceLastUnlock(ended, '2026-09-03T00:00:00.000Z', '2026-09-05T00:00:00.000Z')).toBe(0)
  })
})

describe('evaluateLoveNoteUnlock', () => {
  const lockedNotes = [
    { id: 'old', createdAt: '2026-09-01T00:00:00.000Z' },
    { id: 'new', createdAt: '2026-09-04T00:00:00.000Z' },
  ]

  it('returns null when there are no locked notes', () => {
    expect(
      evaluateLoveNoteUnlock({
        sessionId: 'session-x',
        lockedNotes: [],
        goalMetThisSession: true,
        allSessionEndedAt: [],
        lastUnlockEndedAt: null,
        thisSessionEndedAt: '2026-09-05T00:00:00.000Z',
      })
    ).toBeNull()
  })

  it('unlocks the oldest locked note on a weekly-goal session', () => {
    const result = evaluateLoveNoteUnlock({
      sessionId: 'session-x',
      lockedNotes,
      goalMetThisSession: true,
      allSessionEndedAt: ['2026-09-05T00:00:00.000Z'],
      lastUnlockEndedAt: null,
      thisSessionEndedAt: '2026-09-05T00:00:00.000Z',
    })
    expect(result).toEqual({ noteId: 'old', reasonCode: 'weeklyGoal' })
  })

  it('unlocks on the pity timer even with no weekly goal met', () => {
    const endedAt = ['2026-09-01T00:00:00.000Z', '2026-09-02T00:00:00.000Z', '2026-09-03T00:00:00.000Z', '2026-09-04T12:00:00.000Z']
    const result = evaluateLoveNoteUnlock({
      sessionId: 'session-pity',
      lockedNotes,
      goalMetThisSession: false,
      allSessionEndedAt: endedAt,
      lastUnlockEndedAt: null,
      thisSessionEndedAt: '2026-09-04T12:00:00.000Z',
    })
    expect(result).toEqual({ noteId: 'old', reasonCode: 'pity' })
  })

  it('returns null when the roll fails and nothing guarantees it', () => {
    // Find a session id that rolls false under these otherwise-neutral
    // conditions, then confirm evaluate agrees with decide.
    const falseId = Array.from({ length: 50 }, (_, i) => `session-${i}`).find(
      (id) =>
        !decideLoveNoteUnlock({ sessionId: id, lockedCount: lockedNotes.length, goalMetThisSession: false, sessionsSinceLastUnlock: 0 })
          .unlock
    )
    expect(falseId).toBeDefined()
    const result = evaluateLoveNoteUnlock({
      sessionId: falseId!,
      lockedNotes,
      goalMetThisSession: false,
      allSessionEndedAt: ['2026-09-05T00:00:00.000Z'],
      lastUnlockEndedAt: null,
      thisSessionEndedAt: '2026-09-05T00:00:00.000Z',
    })
    expect(result).toBeNull()
  })
})
