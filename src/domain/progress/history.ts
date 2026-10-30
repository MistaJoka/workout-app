import type { SessionEvent, SessionPlan, SessionResult } from '../session/types'
import type { SetRecord } from './types'
import { effectiveSetSlots } from '../session/appliedEvents'
import { eventsBySession, plansById } from './historyIndex'

// Projects persisted history into SetRecords. Pure: no storage authority of
// its own (docs/rnd/foss-fitness/sources/ischys.md, "Local target architecture").
//
// Each applied SET_COMPLETED maps to the plan slot the session pointed at
// when it applied (effectiveSetSlots): stray taps are dropped and a skipped
// move doesn't shift later sets, so exercise and set number come from the
// immutable plan, not from the event payload. Three payload fields are read from the event, all
// optional: `met` (false is a miss; true or absent — time-based sets, older
// events — is met), `reps` (performed reps, when the player logged them),
// and `weightKg` (the load actually lifted; falls back to the plan's
// prescribed weight for weighted exercises).
// Every derived reward (XP, carrots, badges, highlights...) projects the
// same history, often several times per screen. Cached per events array,
// valid only while the plans and results arrays are the same ones too.
// Callers treat the returned records as read-only.
const projectionCache = new WeakMap<
  readonly SessionEvent[],
  { plans: readonly SessionPlan[]; results: readonly SessionResult[]; records: SetRecord[] }
>()

export function projectSetRecords(
  plans: readonly SessionPlan[],
  results: readonly SessionResult[],
  events: readonly SessionEvent[]
): SetRecord[] {
  const cached = projectionCache.get(events)
  if (cached && cached.plans === plans && cached.results === results) return cached.records
  const records = projectSetRecordsUncached(plans, results, events)
  projectionCache.set(events, { plans, results, records })
  projections.add(records)
  return records
}

// Records this module projected: ordered by session end, every session's
// records carrying its result's endedAt, and never mutated (callers treat
// them as read-only). sessionHighlights relies on that to answer from one
// shared pass instead of re-scanning history per session.
const projections = new WeakSet<readonly SetRecord[]>()

export function isProjectedRecords(records: readonly SetRecord[]): boolean {
  return projections.has(records)
}

function projectSetRecordsUncached(
  plans: readonly SessionPlan[],
  results: readonly SessionResult[],
  events: readonly SessionEvent[]
): SetRecord[] {
  const planById = plansById(plans)
  const bySession = eventsBySession(events)

  const ordered = [...results].sort((a, b) => a.endedAt.localeCompare(b.endedAt))
  const records: SetRecord[] = []

  for (const result of ordered) {
    const plan = planById.get(result.planId)
    if (!plan) continue
    for (const { event, exerciseIndex, setNumber } of effectiveSetSlots(plan, bySession.get(result.sessionId) ?? [])) {
      const exercise = plan.exercises[exerciseIndex]
      if (!exercise) continue
      records.push({
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.name,
        sessionId: result.sessionId,
        sessionEndedAt: result.endedAt,
        setNumber,
        ...(exercise.reps != null ? { prescribedReps: exercise.reps } : {}),
        ...(exercise.timeSeconds != null ? { prescribedSeconds: exercise.timeSeconds } : {}),
        ...(typeof event.payload.reps === 'number' ? { performedReps: event.payload.reps } : {}),
        ...(typeof event.payload.weightKg === 'number'
          ? { weight: event.payload.weightKg }
          : exercise.weightKg != null
            ? { weight: exercise.weightKg }
            : {}),
        met: event.payload.met !== false,
      })
    }
  }

  return records
}
