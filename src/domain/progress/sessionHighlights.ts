import type { SessionResult } from '../session/types'
import { detectPersonalRecords, improvedRecord } from './stats'
import { isProjectedRecords } from './history'
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

  const newBests = newBestsFromIndex(records, sessionId, endedAt) ?? scanNewBests(records, sessionId, endedAt)

  const count = results.filter((r) => r.endedAt < endedAt || r.sessionId === sessionId).length
  const milestone = (MILESTONES as readonly number[]).includes(count) ? count : null

  return { newBests, milestone }
}

function scanNewBests(records: readonly SetRecord[], sessionId: string, endedAt: string): PersonalRecord[] {
  const upToThis = records.filter((r) => r.sessionEndedAt < endedAt || r.sessionId === sessionId)
  const before = upToThis.filter((r) => r.sessionId !== sessionId)
  const priorBest = detectPersonalRecords(before)
  return [...detectPersonalRecords(upToThis).values()].filter(
    (best) => best.sessionId === sessionId && priorBest.has(best.exerciseId)
  )
}

// Every session's new bests from one ordered pass over the records, built
// once per projected records array (history.ts): scanning all history per
// session made Badges, Recap and Progress quadratic (UX audit 2026-10-29,
// P3). Same answer as scanNewBests: a session is judged against the bests
// of sessions that ended strictly before it, then its own records run in
// order; the bests it moves on a move that already had one are its new
// bests, in the order those moves first appeared.
type NewBestsIndex = { bySession: Map<string, PersonalRecord[]>; endedAt: Map<string, string> }

const indexCache = new WeakMap<readonly SetRecord[], NewBestsIndex>()

function newBestsFromIndex(records: readonly SetRecord[], sessionId: string, endedAt: string): PersonalRecord[] | null {
  if (!isProjectedRecords(records)) return null
  let index = indexCache.get(records)
  if (!index) {
    index = buildNewBestsIndex(records)
    indexCache.set(records, index)
  }
  const own = index.endedAt.get(sessionId)
  // No records of its own: nothing it could have beaten.
  if (own === undefined) return []
  // Judged at another moment than its records say: scan instead.
  if (own !== endedAt) return null
  return [...(index.bySession.get(sessionId) ?? [])]
}

function buildNewBestsIndex(records: readonly SetRecord[]): NewBestsIndex {
  const ordered = [...records].sort((a, b) => a.sessionEndedAt.localeCompare(b.sessionEndedAt))
  const best = new Map<string, PersonalRecord>()
  const firstSeen = new Map<string, number>()
  const bySession = new Map<string, PersonalRecord[]>()
  const endedAt = new Map<string, string>()
  let i = 0
  while (i < ordered.length) {
    // Sessions ending at the same moment are each judged without the others.
    const moment = ordered[i].sessionEndedAt
    let end = i
    const group = new Map<string, SetRecord[]>()
    while (end < ordered.length && ordered[end].sessionEndedAt === moment) {
      const record = ordered[end]
      const list = group.get(record.sessionId)
      if (list) list.push(record)
      else group.set(record.sessionId, [record])
      end += 1
    }
    for (const [id, own] of group) {
      endedAt.set(id, moment)
      const moved = new Map<string, PersonalRecord>()
      for (const record of own) {
        const next = improvedRecord(moved.get(record.exerciseId) ?? best.get(record.exerciseId), record)
        if (next) moved.set(record.exerciseId, next)
      }
      const bests = [...moved.values()]
        .filter((b) => best.has(b.exerciseId))
        .sort((a, b) => firstSeen.get(a.exerciseId)! - firstSeen.get(b.exerciseId)!)
      if (bests.length > 0) bySession.set(id, bests)
    }
    for (let k = i; k < end; k++) {
      const record = ordered[k]
      const next = improvedRecord(best.get(record.exerciseId), record)
      if (next) {
        if (!best.has(record.exerciseId)) firstSeen.set(record.exerciseId, firstSeen.size)
        best.set(record.exerciseId, next)
      }
    }
    i = end
  }
  return { bySession, endedAt }
}
