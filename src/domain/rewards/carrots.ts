import type { SessionEvent, SessionPlan, SessionResult } from '../session/types'
import { goalForWeek, mondayKey as weekKey, type WeekGoal } from '../progress/weekGoals'
import { projectSetRecords } from '../progress/history'
import { flowStatus } from '../session/flow'
import { effectiveSetSlots } from '../session/appliedEvents'

// Carrots: Hubby Bunny's reward-shop currency. Like Bloom XP (xp.ts),
// EARNED carrots are derived from history every time rather than stored, so
// they can never drift out of sync with what actually happened. The spent
// side lives in a ledger (redemptions, infrastructure/db/schema.ts) because
// a redemption is a real event with no deterministic formula to replay it
// from -- the balance a screen shows is simply earned minus that ledger's
// total, computed by the caller (CarrotCelebration.tsx), never here.
export const CARROT_RULES = {
  perWorkout: 10,
  perSet: 1,
  perfectBonus: 5,
  weeklyGoalBonus: 20,
  // Welcome back: the first workout after a gap of this many days pays a
  // bonus. It rewards the comeback (the StepUp megastudy's best arm) and
  // never takes anything away for the time off.
  welcomeBackBonus: 15,
  welcomeBackGapDays: 7,
} as const

// One source of carrots within a finished session: a workout bonus, a sets
// bonus, a perfect-workout bonus, a welcome-back bonus, or the once-a-week
// goal bonus. `id` is
// stable per session (never reused across sessions) so a UI can key a list
// of these without extra bookkeeping.
export type CarrotSource = {
  id: string
  at: string // ISO timestamp
  amount: number
  label: string
}

export type SessionCarrots = {
  sessionId: string
  endedAt: string
  sources: CarrotSource[]
  total: number
}

export type CarrotsHistory = {
  plans: readonly SessionPlan[]
  results: readonly SessionResult[]
  events: readonly SessionEvent[]
}

export type EarnedCarrots = {
  total: number
  bySession: SessionCarrots[]
  // Carried straight through from the `extraCarrotSources` parameter, so a
  // caller that wants "every source, earned and extra" has one place to
  // read it from.
  extra: CarrotSource[]
}

// Earned carrots, derived deterministically from history (never stored).
// `extraCarrotSources` is a hook: other features (bosses, quests, ...) that
// don't yet exist can feed in their own already-computed CarrotSource rows
// without this function knowing anything about them. Nothing calls it with
// a non-empty array today.
export function earnedCarrots(
  history: CarrotsHistory,
  weeklyGoal: WeekGoal,
  extraCarrotSources: readonly CarrotSource[] = []
): EarnedCarrots {
  const results = [...history.results].sort((a, b) => a.endedAt.localeCompare(b.endedAt))
  const records = projectSetRecords(history.plans, history.results, history.events)
  const plansById = new Map(history.plans.map((p) => [p.id, p]))
  const eventsBySession = new Map<string, SessionEvent[]>()
  for (const event of history.events) {
    const list = eventsBySession.get(event.sessionId) ?? []
    list.push(event)
    eventsBySession.set(event.sessionId, list)
  }

  // Grouped once: filtering every record per session made this quadratic.
  const recordsBySession = new Map<string, typeof records>()
  for (const r of records) recordsBySession.set(r.sessionId, [...(recordsBySession.get(r.sessionId) ?? []), r])
  const weekCounts = new Map<string, number>()
  const bySession: SessionCarrots[] = []
  let total = 0

  let previousEndedAt: string | null = null
  for (const result of results) {
    const sessionRecords = recordsBySession.get(result.sessionId) ?? []
    const sources: CarrotSource[] = [
      { id: `${result.sessionId}:workout`, at: result.endedAt, amount: CARROT_RULES.perWorkout, label: 'Workout finished' },
    ]
    if (sessionRecords.length > 0) {
      sources.push({
        id: `${result.sessionId}:sets`,
        at: result.endedAt,
        amount: sessionRecords.length * CARROT_RULES.perSet,
        label: `${sessionRecords.length} ${sessionRecords.length === 1 ? 'set' : 'sets'}`,
      })
    }
    const plan = plansById.get(result.planId)
    if (plan && flowStatus(plan, eventsBySession.get(result.sessionId) ?? []).perfect) {
      sources.push({
        id: `${result.sessionId}:perfect`,
        at: result.endedAt,
        amount: CARROT_RULES.perfectBonus,
        label: 'Perfect workout',
      })
    }
    if (
      previousEndedAt !== null &&
      Date.parse(result.endedAt) - Date.parse(previousEndedAt) >= CARROT_RULES.welcomeBackGapDays * 24 * 60 * 60 * 1000
    ) {
      sources.push({
        id: `${result.sessionId}:welcomeBack`,
        at: result.endedAt,
        amount: CARROT_RULES.welcomeBackBonus,
        label: 'Welcome back',
      })
    }
    previousEndedAt = result.endedAt
    const goal = goalForWeek(weeklyGoal, new Date(result.endedAt))
    if (goal > 0) {
      const week = weekKey(new Date(result.endedAt))
      const inWeek = (weekCounts.get(week) ?? 0) + 1
      weekCounts.set(week, inWeek)
      if (inWeek === goal) {
        sources.push({
          id: `${result.sessionId}:weeklyGoal`,
          at: result.endedAt,
          amount: CARROT_RULES.weeklyGoalBonus,
          label: "This week's goal met",
        })
      }
    }
    const sessionTotal = sources.reduce((sum, s) => sum + s.amount, 0)
    bySession.push({ sessionId: result.sessionId, endedAt: result.endedAt, sources, total: sessionTotal })
    total += sessionTotal
  }

  for (const extra of extraCarrotSources) total += extra.amount

  return { total, bySession, extra: [...extraCarrotSources] }
}

// What one finished session earned, or null if it isn't (yet) a finished
// session in this history.
export function carrotsForSession(history: CarrotsHistory, weeklyGoal: WeekGoal, sessionId: string): SessionCarrots | null {
  return earnedCarrots(history, weeklyGoal).bySession.find((s) => s.sessionId === sessionId) ?? null
}

// A workout in progress: the carrots its sets have earned so far (one per
// effective set, the same slots the finished session's count uses, so an
// undone set takes its carrot back). Finish bonuses arrive on Complete.
export function liveSetCarrots(plan: SessionPlan, events: readonly SessionEvent[]): number {
  return effectiveSetSlots(plan, events).length * CARROT_RULES.perSet
}
