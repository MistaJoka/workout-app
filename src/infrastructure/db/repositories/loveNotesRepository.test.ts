import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../schema'
import {
  addLoveNote,
  evaluateLoveNoteUnlockForSession,
  listLoveNotes,
  markLoveNoteRead,
  removeLoveNote,
  updateLoveNote,
} from './loveNotesRepository'
import { decideLoveNoteUnlock } from '../../../domain/rewards/loveNotes'

beforeEach(async () => {
  await db.loveNotes.clear()
  await db.settings.clear()
})

describe('loveNotesRepository CRUD', () => {
  it('adds a note, locked by default, and lists it oldest first', async () => {
    const first = await addLoveNote({ text: 'Proud of you', emoji: '💌' }, '2026-09-01T00:00:00.000Z')
    const second = await addLoveNote({ text: 'You are my favorite workout partner', emoji: '💕' }, '2026-09-02T00:00:00.000Z')
    expect(first.unlockedAt).toBeNull()
    expect(first.readAt).toBeNull()
    const all = await listLoveNotes()
    expect(all.map((n) => n.id)).toEqual([first.id, second.id])
  })

  it('trims the text and caps it at 280 characters', async () => {
    const long = 'x'.repeat(400)
    const note = await addLoveNote({ text: `  ${long}  `, emoji: '💌' })
    expect(note.text).toHaveLength(280)
    expect(note.text).toBe('x'.repeat(280))
  })

  it('updates a note and bumps updatedAt', async () => {
    const note = await addLoveNote({ text: 'First draft', emoji: '💌' }, '2026-09-01T00:00:00.000Z')
    const updated = await updateLoveNote(note.id, { text: 'Second draft' }, '2026-09-05T00:00:00.000Z')
    expect(updated).toMatchObject({ id: note.id, text: 'Second draft', updatedAt: '2026-09-05T00:00:00.000Z' })
  })

  it('updateLoveNote on a missing id returns undefined and writes nothing', async () => {
    expect(await updateLoveNote('nope', { text: 'x' })).toBeUndefined()
    expect(await listLoveNotes()).toEqual([])
  })

  it('removeLoveNote deletes the note entirely', async () => {
    const note = await addLoveNote({ text: 'Gone soon', emoji: '💌' })
    await removeLoveNote(note.id)
    expect(await listLoveNotes()).toEqual([])
  })

  it('markLoveNoteRead sets readAt once and is a no-op afterwards', async () => {
    const note = await addLoveNote({ text: 'Read me', emoji: '💌' })
    const read = await markLoveNoteRead(note.id, '2026-09-05T00:00:00.000Z')
    expect(read?.readAt).toBe('2026-09-05T00:00:00.000Z')
    const rereadAttempt = await markLoveNoteRead(note.id, '2026-09-09T00:00:00.000Z')
    expect(rereadAttempt?.readAt).toBe('2026-09-05T00:00:00.000Z')
  })
})

describe('evaluateLoveNoteUnlockForSession', () => {
  it('returns null when there are no notes at all', async () => {
    const result = await evaluateLoveNoteUnlockForSession('session-1', {
      allSessionEndedAt: ['2026-09-05T00:00:00.000Z'],
      goalMetThisSession: false,
      thisSessionEndedAt: '2026-09-05T00:00:00.000Z',
    })
    expect(result).toBeNull()
  })

  it('unlocks the oldest locked note and stamps it, on a weekly-goal session', async () => {
    const older = await addLoveNote({ text: 'Older note', emoji: '💌' }, '2026-09-01T00:00:00.000Z')
    await addLoveNote({ text: 'Newer note', emoji: '💕' }, '2026-09-02T00:00:00.000Z')

    const result = await evaluateLoveNoteUnlockForSession('session-goal', {
      allSessionEndedAt: ['2026-09-05T00:00:00.000Z'],
      goalMetThisSession: true,
      thisSessionEndedAt: '2026-09-05T00:00:00.000Z',
    })

    expect(result).toMatchObject({ id: older.id, unlockedAt: '2026-09-05T00:00:00.000Z', unlockedBySessionId: 'session-goal' })
    const stored = await db.loveNotes.get(older.id)
    expect(stored?.unlockedAt).toBe('2026-09-05T00:00:00.000Z')
  })

  it('is idempotent: re-evaluating the same session returns the same unlocked note without touching another one', async () => {
    const older = await addLoveNote({ text: 'Older note', emoji: '💌' }, '2026-09-01T00:00:00.000Z')
    const newer = await addLoveNote({ text: 'Newer note', emoji: '💕' }, '2026-09-02T00:00:00.000Z')

    const input = {
      allSessionEndedAt: ['2026-09-05T00:00:00.000Z'],
      goalMetThisSession: true,
      thisSessionEndedAt: '2026-09-05T00:00:00.000Z',
    }
    const first = await evaluateLoveNoteUnlockForSession('session-repeat', input)
    const second = await evaluateLoveNoteUnlockForSession('session-repeat', input)

    expect(first?.id).toBe(older.id)
    expect(second?.id).toBe(older.id)
    const newerStored = await db.loveNotes.get(newer.id)
    expect(newerStored?.unlockedAt).toBeNull()
  })

  it('a session that unlocks nothing is still marked evaluated, so it never re-rolls on revisit', async () => {
    await addLoveNote({ text: 'Only note', emoji: '💌' }, '2026-09-01T00:00:00.000Z')
    // Find a session id guaranteed to roll false under neutral conditions.
    const noRollId = Array.from({ length: 50 }, (_, i) => `session-${i}`).find(
      (id) => !decideLoveNoteUnlock({ sessionId: id, lockedCount: 1, goalMetThisSession: false, sessionsSinceLastUnlock: 0 }).unlock
    )
    expect(noRollId).toBeDefined()

    const input = { allSessionEndedAt: ['2026-09-05T00:00:00.000Z'], goalMetThisSession: false, thisSessionEndedAt: '2026-09-05T00:00:00.000Z' }
    const first = await evaluateLoveNoteUnlockForSession(noRollId!, input)
    expect(first).toBeNull()

    // Revisit with a context that would now look like "3 workouts since
    // nothing unlocked" if this session were mistakenly re-evaluated from
    // scratch -- but the evaluated-sessions guard must short-circuit before
    // that, returning null again rather than unlocking on a pity re-roll.
    const second = await evaluateLoveNoteUnlockForSession(noRollId!, {
      allSessionEndedAt: ['2026-09-01T00:00:00.000Z', '2026-09-02T00:00:00.000Z', '2026-09-05T00:00:00.000Z'],
      goalMetThisSession: false,
      thisSessionEndedAt: '2026-09-05T00:00:00.000Z',
    })
    expect(second).toBeNull()
    expect((await listLoveNotes())[0].unlockedAt).toBeNull()
  })

  it('does nothing when every note is already unlocked', async () => {
    const note = await addLoveNote({ text: 'Already open', emoji: '💌' }, '2026-09-01T00:00:00.000Z')
    await evaluateLoveNoteUnlockForSession('session-first', {
      allSessionEndedAt: ['2026-09-02T00:00:00.000Z'],
      goalMetThisSession: true,
      thisSessionEndedAt: '2026-09-02T00:00:00.000Z',
    })
    const result = await evaluateLoveNoteUnlockForSession('session-second', {
      allSessionEndedAt: ['2026-09-02T00:00:00.000Z', '2026-09-03T00:00:00.000Z'],
      goalMetThisSession: true,
      thisSessionEndedAt: '2026-09-03T00:00:00.000Z',
    })
    expect(result).toBeNull()
    const stored = await db.loveNotes.get(note.id)
    expect(stored?.unlockedBySessionId).toBe('session-first')
  })
})
