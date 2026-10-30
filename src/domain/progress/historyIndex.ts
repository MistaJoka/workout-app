import type { SessionEvent, SessionPlan } from '../session/types'

// Every derived reward (XP, carrots, badges, bosses, highlights, recaps...)
// needs history grouped by session, and a screen asks several of them at
// once. Grouping per call, or filtering all events per session, made those
// screens superlinear in history size (UX audit 2026-10-29, P3). These
// groupings are built once per input array and shared: callers pass the
// same arrays they already pass today, and treat what comes back as
// read-only (each session's list is frozen).
//
// A frozen per-session list is also what lets effectiveSetSlots
// (session/appliedEvents.ts) remember its replay: a frozen array can't
// change under the cache.

export type EventsBySession = ReadonlyMap<string, readonly SessionEvent[]>

const eventsCache = new WeakMap<readonly SessionEvent[], EventsBySession>()
const plansCache = new WeakMap<readonly SessionPlan[], ReadonlyMap<string, SessionPlan>>()

const NO_EVENTS: readonly SessionEvent[] = Object.freeze([])

// Each session's events, in the order they appear in `events`.
export function eventsBySession(events: readonly SessionEvent[]): EventsBySession {
  const cached = eventsCache.get(events)
  if (cached) return cached
  const grouped = new Map<string, SessionEvent[]>()
  for (const event of events) {
    const list = grouped.get(event.sessionId)
    if (list) list.push(event)
    else grouped.set(event.sessionId, [event])
  }
  for (const list of grouped.values()) Object.freeze(list)
  eventsCache.set(events, grouped)
  return grouped
}

export function sessionEventsOf(events: readonly SessionEvent[], sessionId: string): readonly SessionEvent[] {
  return eventsBySession(events).get(sessionId) ?? NO_EVENTS
}

// For a caller that re-reads history and wants to hand over its own
// grouping (application/historyIndex.ts keeps unchanged sessions' lists
// across reads, so their replays stay cached). It must be exactly what
// eventsBySession(events) would build: same sessions, same order, every
// list frozen.
export function seedEventsBySession(events: readonly SessionEvent[], grouped: EventsBySession): void {
  eventsCache.set(events, grouped)
}

export function plansById(plans: readonly SessionPlan[]): ReadonlyMap<string, SessionPlan> {
  const cached = plansCache.get(plans)
  if (cached) return cached
  const byId = new Map(plans.map((p) => [p.id, p]))
  plansCache.set(plans, byId)
  return byId
}
