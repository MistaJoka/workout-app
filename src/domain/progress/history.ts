import type { SessionEvent, SessionPlan, SessionResult } from '../session/types'
import type { SetRecord } from './types'
import { effectiveSets } from '../session/appliedEvents'

// Projects persisted history into SetRecords. Pure: no storage authority of
// its own (docs/rnd/foss-fitness/sources/ischys.md, "Local target architecture").
//
// The k-th applied SET_COMPLETED event of a session is the k-th set slot
// of its immutable plan — the session machine advances exactly one slot
// per applied SET_COMPLETED; stray taps are dropped by effectiveSets — so exercise and set number come from the plan, not from
// the event payload. Three payload fields are read from the event, all
// optional: `met` (false is a miss; true or absent — time-based sets, older
// events — is met), `reps` (performed reps, when the player logged them),
// and `weightKg` (the load actually lifted; falls back to the plan's
// prescribed weight for weighted exercises).
export function projectSetRecords(
  plans: readonly SessionPlan[],
  results: readonly SessionResult[],
  events: readonly SessionEvent[]
): SetRecord[] {
  const planById = new Map(plans.map((p) => [p.id, p]))
  const eventsBySession = new Map<string, SessionEvent[]>()
  for (const event of events) {
    const list = eventsBySession.get(event.sessionId) ?? []
    list.push(event)
    eventsBySession.set(event.sessionId, list)
  }

  const ordered = [...results].sort((a, b) => a.endedAt.localeCompare(b.endedAt))
  const records: SetRecord[] = []

  for (const result of ordered) {
    const plan = planById.get(result.planId)
    if (!plan) continue
    const sessionEvents = effectiveSets(plan, eventsBySession.get(result.sessionId) ?? [])
    const slots = plan.exercises.flatMap((exercise) =>
      Array.from({ length: exercise.sets }, (_, i) => ({ exercise, setNumber: i + 1 }))
    )
    sessionEvents.forEach((event, index) => {
      const slot = slots[index]
      if (!slot) return
      const { exercise, setNumber } = slot
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
    })
  }

  return records
}
