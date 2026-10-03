// Hubby Bunny's surprise love notes: after a finished workout, a locked
// note has a chance to unlock. Pure, framework-independent decision logic
// only -- the repository (infrastructure/db/repositories/loveNotesRepository.ts)
// owns reading/writing the actual notes and the idempotency guard around
// calling this more than once for the same session.

export const LOVE_NOTE_RULES = {
  // Soft pity: the per-workout chance, indexed by finished workouts since
  // the last unlock (0, 1, 2). It climbs toward the hard guarantee below,
  // the two-stage shape gacha games use, so a dry spell eases off gradually.
  chanceBySessionsSince: [0.4, 0.55, 0.75],
  // Guaranteed once this many finished workouts have passed since the last
  // unlock (or since the beginning, if nothing has ever unlocked) without
  // one -- so a long unlucky streak never goes on forever.
  pityAfterWorkouts: 3,
} as const

export type LoveNoteUnlockReason = 'pity' | 'weeklyGoal' | 'chance'

export type LoveNoteUnlockDecision = { unlock: false } | { unlock: true; reasonCode: LoveNoteUnlockReason }

export type LoveNoteUnlockContext = {
  sessionId: string
  // How many notes are currently locked. Zero means there's nothing to
  // unlock, regardless of every other rule.
  lockedCount: number
  // This exact session is the one that reached the week's goal (same
  // session domain/progress/goalBloom.ts's goalBloomForSession marks).
  goalMetThisSession: boolean
  // Finished sessions strictly after the last unlock (or every session
  // ever, if nothing has unlocked yet) and strictly before this one.
  sessionsSinceLastUnlock: number
}

// Deterministic by sessionId alone: re-evaluating the same session with the
// same context always gives the same answer, so a retried/duplicate call
// can never re-roll (the repository's own idempotency guard is the belt;
// this determinism is the suspenders).
export function decideLoveNoteUnlock(ctx: LoveNoteUnlockContext): LoveNoteUnlockDecision {
  if (ctx.lockedCount <= 0) return { unlock: false }
  if (ctx.sessionsSinceLastUnlock >= LOVE_NOTE_RULES.pityAfterWorkouts) return { unlock: true, reasonCode: 'pity' }
  if (ctx.goalMetThisSession) return { unlock: true, reasonCode: 'weeklyGoal' }
  return seededRoll(ctx.sessionId) < loveNoteChance(ctx.sessionsSinceLastUnlock) ? { unlock: true, reasonCode: 'chance' } : { unlock: false }
}

// This workout's chance of a note, given how many finished workouts passed
// since the last one unlocked: soft pity first, then the hard guarantee.
export function loveNoteChance(sessionsSince: number): number {
  if (sessionsSince >= LOVE_NOTE_RULES.pityAfterWorkouts) return 1
  const table = LOVE_NOTE_RULES.chanceBySessionsSince
  return table[Math.max(0, Math.min(sessionsSince, table.length - 1))]
}

export type LoveNoteQueueItem = { id: string; createdAt: string }

// FIFO: the oldest locked note (by createdAt, ties broken by id for a total
// order) unlocks first -- Hubby Bunny's writing order is the unlock order,
// never randomized pick-of-the-litter.
export function pickNoteToUnlock(locked: readonly LoveNoteQueueItem[]): string | null {
  if (locked.length === 0) return null
  const sorted = [...locked].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
  return sorted[0].id
}

// How many finished sessions landed strictly after the last unlock (null =
// nothing has ever unlocked, so every session ever counts) and strictly
// before the session being evaluated -- the pity timer's own count.
export function sessionsSinceLastUnlock(
  allSessionEndedAt: readonly string[],
  lastUnlockEndedAt: string | null,
  thisSessionEndedAt: string
): number {
  return allSessionEndedAt.filter(
    (at) => (lastUnlockEndedAt === null || at > lastUnlockEndedAt) && at < thisSessionEndedAt
  ).length
}

export type LoveNoteUnlockInput = {
  sessionId: string
  lockedNotes: readonly LoveNoteQueueItem[]
  goalMetThisSession: boolean
  allSessionEndedAt: readonly string[]
  lastUnlockEndedAt: string | null
  thisSessionEndedAt: string
}

export type LoveNoteUnlockResult = { noteId: string; reasonCode: LoveNoteUnlockReason }

// The combined decision: whether anything unlocks this session, and which
// note it is -- everything the repository needs to know before it writes.
export function evaluateLoveNoteUnlock(input: LoveNoteUnlockInput): LoveNoteUnlockResult | null {
  // Only notes that already existed when this workout finished: a catch-up
  // over older workouts (loveNotesRepository) must never open a note early.
  const lockedNotes = input.lockedNotes.filter((n) => n.createdAt <= input.thisSessionEndedAt)
  if (lockedNotes.length === 0) return null
  const decision = decideLoveNoteUnlock({
    sessionId: input.sessionId,
    lockedCount: lockedNotes.length,
    goalMetThisSession: input.goalMetThisSession,
    sessionsSinceLastUnlock: sessionsSinceLastUnlock(
      input.allSessionEndedAt,
      input.lastUnlockEndedAt,
      input.thisSessionEndedAt
    ),
  })
  if (!decision.unlock) return null
  const noteId = pickNoteToUnlock(lockedNotes)
  return noteId ? { noteId, reasonCode: decision.reasonCode } : null
}

// A deterministic 0..1 roll from the session id (same FNV-1a-ish shape as
// domain/progress/goalBloom.ts's local `unit`, kept local here so this
// stays a standalone pure module with no shared seam to drift out of sync).
function seededRoll(seed: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  hash ^= hash >>> 16
  hash = Math.imul(hash, 0x85ebca6b)
  hash ^= hash >>> 13
  return (hash >>> 0) / 0x100000000
}
