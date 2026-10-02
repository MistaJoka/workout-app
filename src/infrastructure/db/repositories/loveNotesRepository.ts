import { db } from '../schema'
import type { LoveNoteRecord } from '../schema'
import { newId } from '../../../shared/id'
import { getSetting, setSetting } from './settingsRepository'
import { evaluateLoveNoteUnlock } from '../../../domain/rewards/loveNotes'

// Hubby Bunny's surprise love-note queue. Only he (PIN-gated in the UI,
// same gate as the reward shop) writes, edits or removes notes; both
// profiles on a device can read the list -- she sees opened ones and a
// sealed count (presentation/screens/LoveNotesBoxScreen.tsx), he sees text
// for both locked and opened ones (presentation/components/LoveNotesEditorSheet.tsx).

export async function listLoveNotes(): Promise<LoveNoteRecord[]> {
  return db.loveNotes.orderBy('createdAt').toArray()
}

export async function addLoveNote(
  input: { text: string; emoji: string },
  at: string = new Date().toISOString()
): Promise<LoveNoteRecord> {
  const note: LoveNoteRecord = {
    id: newId(),
    text: input.text.trim().slice(0, 280),
    emoji: input.emoji,
    createdAt: at,
    updatedAt: at,
    unlockedAt: null,
    unlockedBySessionId: null,
    readAt: null,
  }
  await db.loveNotes.put(note)
  return note
}

export async function updateLoveNote(
  id: string,
  patch: Partial<Pick<LoveNoteRecord, 'text' | 'emoji'>>,
  at: string = new Date().toISOString()
): Promise<LoveNoteRecord | undefined> {
  const existing = await db.loveNotes.get(id)
  if (!existing) return undefined
  const next: LoveNoteRecord = {
    ...existing,
    ...patch,
    ...(patch.text != null ? { text: patch.text.trim().slice(0, 280) } : {}),
    updatedAt: at,
  }
  await db.loveNotes.put(next)
  return next
}

export async function removeLoveNote(id: string): Promise<void> {
  await db.loveNotes.delete(id)
}

// Imports a note from a gift link (domain/rewards/giftLink.ts) by its own
// stable id, rather than minting a new one with addLoveNote: re-accepting
// the same gift link is then a no-op, instead of a duplicate locked note.
// Always lands locked (unlockedAt null) -- a gifted note is never a shortcut
// around the usual unlock-after-a-workout surprise.
export async function upsertLoveNoteFromGift(
  note: { id: string; text: string; emoji: string },
  at: string = new Date().toISOString()
): Promise<LoveNoteRecord> {
  const existing = await db.loveNotes.get(note.id)
  if (existing) return existing
  const created: LoveNoteRecord = {
    id: note.id,
    text: note.text.trim().slice(0, 280),
    emoji: note.emoji,
    createdAt: at,
    updatedAt: at,
    unlockedAt: null,
    unlockedBySessionId: null,
    readAt: null,
  }
  await db.loveNotes.put(created)
  return created
}

// The envelope is opened (or reopened from the notes box): marks `readAt`
// the first time only, so a reread never bumps it and never disturbs the
// export/import merge's "newest wins by updatedAt" ordering on a note
// that's already been read.
export async function markLoveNoteRead(id: string, at: string = new Date().toISOString()): Promise<LoveNoteRecord | undefined> {
  const existing = await db.loveNotes.get(id)
  if (!existing || existing.readAt) return existing
  const next: LoveNoteRecord = { ...existing, readAt: at, updatedAt: at }
  await db.loveNotes.put(next)
  return next
}

// Sessions already evaluated for a love-note unlock, whether or not one
// actually unlocked -- so a session with no locked notes left, or one that
// simply didn't roll an unlock, is never re-evaluated (which could pick a
// *different* note once this session is no longer the oldest-locked
// candidate). Deliberately separate from "a note's unlockedBySessionId
// matches" -- that alone can't tell a not-yet-evaluated session apart from
// one that was evaluated and unlocked nothing.
const EVALUATED_SESSIONS_KEY = 'loveNotesEvaluatedSessions'

async function markSessionEvaluated(sessionId: string): Promise<void> {
  const evaluated = (await getSetting<string[]>(EVALUATED_SESSIONS_KEY)) ?? []
  if (evaluated.includes(sessionId)) return
  await setSetting(EVALUATED_SESSIONS_KEY, [...evaluated, sessionId])
}

export type LoveNoteUnlockEvalInput = {
  // endedAt of every finished session in history (any order).
  allSessionEndedAt: readonly string[]
  // This exact session reached its week's goal.
  goalMetThisSession: boolean
  // This session's own endedAt (or "now" if it can't be found yet).
  thisSessionEndedAt: string
}

// Evaluates (idempotently) whether this finished session unlocks a love
// note, and writes the unlock if so. Safe to call more than once for the
// same sessionId -- after the first call, every later call for that same
// id returns the same answer (the already-unlocked note, or null) without
// rolling again or touching the database a second time.
export async function evaluateLoveNoteUnlockForSession(
  sessionId: string,
  input: LoveNoteUnlockEvalInput
): Promise<LoveNoteRecord | null> {
  const [notes, evaluated] = await Promise.all([db.loveNotes.toArray(), getSetting<string[]>(EVALUATED_SESSIONS_KEY)])

  const alreadyUnlockedByThis = notes.find((n) => n.unlockedBySessionId === sessionId)
  if (alreadyUnlockedByThis) return alreadyUnlockedByThis
  if ((evaluated ?? []).includes(sessionId)) return null

  const locked = notes.filter((n) => n.unlockedAt === null)
  const lastUnlockEndedAt =
    notes
      .map((n) => n.unlockedAt)
      .filter((at): at is string => at !== null)
      .sort()
      .at(-1) ?? null

  const decision = evaluateLoveNoteUnlock({
    sessionId,
    lockedNotes: locked.map((n) => ({ id: n.id, createdAt: n.createdAt })),
    goalMetThisSession: input.goalMetThisSession,
    allSessionEndedAt: input.allSessionEndedAt,
    lastUnlockEndedAt,
    thisSessionEndedAt: input.thisSessionEndedAt,
  })

  const note = decision ? locked.find((n) => n.id === decision.noteId) : undefined
  if (!decision || !note) {
    await markSessionEvaluated(sessionId)
    return null
  }

  const unlocked: LoveNoteRecord = {
    ...note,
    unlockedAt: input.thisSessionEndedAt,
    unlockedBySessionId: sessionId,
    updatedAt: input.thisSessionEndedAt,
  }
  await db.transaction('rw', [db.loveNotes, db.settings], async () => {
    await db.loveNotes.put(unlocked)
    await markSessionEvaluated(sessionId)
  })
  return unlocked
}
