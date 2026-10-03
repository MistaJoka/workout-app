import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../schema'
import {
  addLoveNote,
  catchUpLoveNoteUnlocks,
  evaluateLoveNoteUnlockForSession,
  listLoveNotes,
  markLoveNoteRead,
  removeLoveNote,
  updateLoveNote,
  upsertLoveNoteFromGift,
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

describe('upsertLoveNoteFromGift', () => {
  it('creates a locked note with the given id, trimmed text and 280-char cap', async () => {
    const created = await upsertLoveNoteFromGift({ id: 'n1', text: `  ${'x'.repeat(400)}  `, emoji: '💌' }, '2026-10-01T00:00:00.000Z')
    expect(created).toEqual({
      id: 'n1',
      text: 'x'.repeat(280),
      emoji: '💌',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
      unlockedAt: null,
      unlockedBySessionId: null,
      readAt: null,
    })
    expect(await listLoveNotes()).toEqual([created])
  })

  it('is a no-op once a note with that id already exists (re-accepting the same gift link)', async () => {
    const first = await upsertLoveNoteFromGift({ id: 'n1', text: 'Proud of you', emoji: '💌' }, '2026-10-01T00:00:00.000Z')
    const second = await upsertLoveNoteFromGift({ id: 'n1', text: 'Different text', emoji: '🙃' }, '2026-10-05T00:00:00.000Z')
    expect(second).toEqual(first)
    expect(await listLoveNotes()).toHaveLength(1)
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

describe('catchUpLoveNoteUnlocks', () => {
  it("gives a workout that never reached Complete its chance, but never opens a note written after it", async () => {
    await db.loveNotes.clear()
    await db.settings.clear()
    await addLoveNote({ text: 'Written first', emoji: '💌' }, '2026-09-01T00:00:00.000Z')
    await addLoveNote({ text: 'Written later', emoji: '💌' }, '2026-09-20T00:00:00.000Z')
    // A goal-meeting workout (guaranteed unlock) that ended between the two notes.
    const unlocked = await catchUpLoveNoteUnlocks([{ sessionId: 'missed', endedAt: '2026-09-10T00:00:00.000Z', goalMet: true }])
    expect(unlocked).toBe(1)
    const notes = await db.loveNotes.toArray()
    expect(notes.find((n) => n.text === 'Written first')?.unlockedBySessionId).toBe('missed')
    expect(notes.find((n) => n.text === 'Written later')?.unlockedAt).toBeNull()
    // Running it again does nothing more.
    expect(await catchUpLoveNoteUnlocks([{ sessionId: 'missed', endedAt: '2026-09-10T00:00:00.000Z', goalMet: true }])).toBe(0)
  })

  it('does nothing when no note is locked', async () => {
    await db.loveNotes.clear()
    expect(await catchUpLoveNoteUnlocks([{ sessionId: 'x', endedAt: '2026-09-10T00:00:00.000Z', goalMet: true }])).toBe(0)
  })
})

