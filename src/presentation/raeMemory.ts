import type { SessionEvent, SessionPlan, SessionResult } from '../domain/session/types'
import { projectSetRecords } from '../domain/progress/history'
import { sessionHighlights } from '../domain/progress/sessionHighlights'
import { buildGarden } from '../domain/progress/garden'
import type { SetRecord } from '../domain/progress/types'
import type { RaeMemory } from './raeSays'
import { EMPTY_RAE_MEMORY } from './raeSays'

// Builds raeSays' memory input from real history, so Rae's recap always
// traces to something that actually happened (CLAUDE.md: never invent). Pure
// and synchronous — callers resolve template display names once (Today
// already builds this map for the week's pots) and hand it in.

// A grown flower keeps being worth mentioning for this many days.
const RECENT_FLOWER_DAYS = 3

const RARITY_RANK: Record<string, number> = { common: 0, uncommon: 1, rare: 2, legendary: 3 }

type Standout = { exerciseName: string; isHold: boolean; isNewBest: boolean } | null

export function buildRaeMemory(args: {
  plans: readonly SessionPlan[]
  results: readonly SessionResult[]
  events: readonly SessionEvent[]
  // templateId -> display name, for the "same template twice" line.
  templateNames: Record<string, string>
  now: Date
}): RaeMemory {
  const { plans, results, events, templateNames, now } = args
  if (results.length === 0) return EMPTY_RAE_MEMORY

  const planById = new Map(plans.map((p) => [p.id, p]))
  const ordered = [...results].sort((a, b) => a.endedAt.localeCompare(b.endedAt))
  const records = projectSetRecords(plans, results, events)

  const last = ordered[ordered.length - 1]
  const previous = ordered.length > 1 ? ordered[ordered.length - 2] : null
  const lastTemplateId = planById.get(last.planId)?.templateId ?? null
  const previousTemplateId = previous ? planById.get(previous.planId)?.templateId ?? null : null

  return {
    lastSession: {
      templateName: lastTemplateId ? templateNames[lastTemplateId] ?? null : null,
      standout: standoutFor(records, ordered, last.sessionId),
    },
    sameTemplateAsPrevious: lastTemplateId != null && lastTemplateId === previousTemplateId,
    recentRareFlower: recentRareFlower(ordered, now),
    justBeatHold: justBeatHold(records, ordered, last.sessionId),
  }
}

// The move to single out from a session: its new best (first one found, in
// plan order), else the move with the most completed sets (same tie-break).
// Null when the session has nothing met to point to.
function standoutFor(records: readonly SetRecord[], results: readonly SessionResult[], sessionId: string): Standout {
  const { newBests } = sessionHighlights(records, results, sessionId)
  if (newBests.length > 0) {
    const best = newBests[0]
    return { exerciseName: best.exerciseName, isHold: best.unit === 'seconds', isNewBest: true }
  }
  const metSets = new Map<string, { exerciseName: string; count: number }>()
  for (const r of records) {
    if (r.sessionId !== sessionId || !r.met) continue
    const entry = metSets.get(r.exerciseId) ?? { exerciseName: r.exerciseName, count: 0 }
    entry.count += 1
    metSets.set(r.exerciseId, entry)
  }
  let top: { exerciseName: string; count: number } | null = null
  for (const entry of metSets.values()) {
    if (!top || entry.count > top.count) top = entry
  }
  return top ? { exerciseName: top.exerciseName, isHold: false, isNewBest: false } : null
}

// A hold/timed move the just-finished session beat its own best on.
function justBeatHold(
  records: readonly SetRecord[],
  results: readonly SessionResult[],
  sessionId: string
): RaeMemory['justBeatHold'] {
  const { newBests } = sessionHighlights(records, results, sessionId)
  const hold = newBests.find((b) => b.unit === 'seconds')
  return hold ? { exerciseName: hold.exerciseName } : null
}

// The rarest non-common flower grown within RECENT_FLOWER_DAYS of now; ties
// go to the more recent one.
function recentRareFlower(results: readonly SessionResult[], now: Date): RaeMemory['recentRareFlower'] {
  const garden = buildGarden(results)
  const cutoff = now.getTime() - RECENT_FLOWER_DAYS * 86_400_000
  let best: { speciesName: string; rank: number; endedAt: string } | null = null
  for (const flower of garden.flowers) {
    if (flower.species.rarity === 'common') continue
    const endedAtMs = Date.parse(flower.endedAt)
    if (endedAtMs < cutoff || endedAtMs > now.getTime()) continue
    const rank = RARITY_RANK[flower.species.rarity]
    if (!best || rank > best.rank || (rank === best.rank && flower.endedAt > best.endedAt)) {
      best = { speciesName: flower.species.name, rank, endedAt: flower.endedAt }
    }
  }
  return best ? { speciesName: best.speciesName } : null
}
