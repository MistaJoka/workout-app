import type { SessionResult } from '../session/types'
import { detectPersonalRecords } from './stats'
import type { PersonalRecord, SetRecord } from './types'

export const MILESTONES = [1, 5, 10, 25, 50, 100] as const

export type SessionHighlights = {
  // Moves where this session beat every earlier session. A move done for the
  // first time has nothing to beat, so it isn't a "best" (that would turn
  // every new move into confetti and make the word meaningless).
  newBests: PersonalRecord[]
  // This session's count among finished workouts, when it lands on one of
  // MILESTONES; otherwise null.
  milestone: number | null
}

// What a just-finished session is worth celebrating, judged only against
// sessions that ended before it (so reopening an old Complete screen gives
// the same answer). Built on detectPersonalRecords, so "best" means exactly
// what Progress means: strictly better, met sets only, ties keep the old.
export function sessionHighlights(
  records: readonly SetRecord[],
  results: readonly SessionResult[],
  sessionId: string
): SessionHighlights {
  const result = results.find((r) => r.sessionId === sessionId)
  if (!result) return { newBests: [], milestone: null }
  const endedAt = result.endedAt

  const upToThis = records.filter((r) => r.sessionEndedAt < endedAt || r.sessionId === sessionId)
  const before = upToThis.filter((r) => r.sessionId !== sessionId)
  const priorBest = detectPersonalRecords(before)
  const newBests = [...detectPersonalRecords(upToThis).values()].filter(
    (best) => best.sessionId === sessionId && priorBest.has(best.exerciseId)
  )

  const count = results.filter((r) => r.endedAt < endedAt || r.sessionId === sessionId).length
  const milestone = (MILESTONES as readonly number[]).includes(count) ? count : null

  return { newBests, milestone }
}
