import { getAllSessionHistory, sessionHistoryVersion } from '../infrastructure/db/repositories/sessionRepository'
import { eventsBySession, seedEventsBySession, type EventsBySession } from '../domain/progress/historyIndex'
import type { SessionEvent, SessionPlan, SessionResult } from '../domain/session/types'

// The session history every derived screen reads (Today, Progress, Badges,
// Recap, Complete, rewards...), read from IndexedDB once per data version
// instead of once per screen and per card (UX audit 2026-10-29, P3).
//
// - Cached until any write to plans, results or events (a set, a finished
//   workout, a discard, an import, another tab): sessionHistoryVersion()
//   moves, and the next caller reads again. A read that a write overtook is
//   handed to its callers but never cached.
// - On a re-read, sessions whose events didn't change keep their previous
//   (frozen) event lists, and plans (immutable) keep their objects, so the
//   per-session replays cached against them (effectiveSetSlots) still
//   answer: finishing a workout replays that one session, not all of them.
//
// Callers treat the snapshot as read-only: it is shared.

export type SessionHistory = {
  plans: SessionPlan[]
  results: SessionResult[]
  events: SessionEvent[]
}

let cached: { version: number; history: SessionHistory } | null = null
let pending: { version: number; read: Promise<SessionHistory> } | null = null

export function loadSessionHistory(): Promise<SessionHistory> {
  const version = sessionHistoryVersion()
  if (cached && cached.version === version) return Promise.resolve(cached.history)
  if (pending && pending.version === version) return pending.read
  const previous = cached?.history ?? null
  const read = getAllSessionHistory().then((raw) => {
    const history = carryOver(raw, previous)
    if (sessionHistoryVersion() === version) cached = { version, history }
    return history
  })
  pending = { version, read }
  const settle = () => {
    if (pending?.read === read) pending = null
  }
  read.then(settle, settle)
  return read
}

// Test hook: forget the snapshot (a test that swaps databases under it).
export function resetSessionHistoryCache(): void {
  cached = null
  pending = null
}

function carryOver(raw: SessionHistory, previous: SessionHistory | null): SessionHistory {
  if (!previous) return raw
  const oldPlans = new Map(previous.plans.map((p) => [p.id, p]))
  const plans = raw.plans.map((p) => {
    const old = oldPlans.get(p.id)
    return old && samePlan(old, p) ? old : p
  })
  const before = eventsBySession(previous.events)
  const grouped = new Map<string, readonly SessionEvent[]>()
  for (const [sessionId, list] of eventsBySession(raw.events)) {
    const old = before.get(sessionId)
    grouped.set(sessionId, old && sameEvents(old, list) ? old : list)
  }
  seedEventsBySession(raw.events, grouped as EventsBySession)
  return { plans, results: raw.results, events: raw.events }
}

// Plans never change once saved; the id and creation time are a cheap
// guard against a different plan reusing an id (a discard, then an import).
function samePlan(a: SessionPlan, b: SessionPlan): boolean {
  return a.createdAt === b.createdAt && a.templateId === b.templateId && a.exercises.length === b.exercises.length
}

// Events are append-only and never edited, so the same ids in the same
// order are the same events.
function sameEvents(a: readonly SessionEvent[], b: readonly SessionEvent[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i].eventId !== b[i].eventId || a[i].seq !== b[i].seq) return false
  return true
}
