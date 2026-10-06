import type { WorkoutLength } from './lengthDial'
export type ReasonCode =
  | 'RETAINED'
  | 'REMOVED_OPTIONAL'
  | 'ADJUSTED_WITHIN_BOUNDS'
  | 'SUBSTITUTED_EQUIVALENT'
  | 'REGRESSED'
  | 'PROGRESSION_CANDIDATE'
  | 'SESSION_COMPRESSED'
  | 'LENGTH_SHORT'
  | 'LENGTH_LONG'

export type AdaptationDecision = {
  exerciseId: string
  reasonCode: ReasonCode
  detail: string
}

export type SessionPlanExercise = {
  exerciseId: string
  exerciseVersion: number
  // Captured at plan-creation time from the Exercise record, not looked up
  // live — the started session must never be reconstructed from mutable
  // canonical content (CLAUDE.md), so the display name is part of the
  // immutable snapshot like everything else here.
  name: string
  sets: number
  reps?: number
  // The template's fixed, never-overridden reps default — the progression
  // engine's policy anchor. `reps` above is the *effective* prescription for
  // this session (an override applied on top), which floats over time as
  // progression advances; the policy range must stay fixed against the
  // original authored value or its ceiling would recede every time reps
  // increase, and PROGRESSION_CANDIDATE could never fire.
  authoredReps?: number
  timeSeconds?: number
  restSeconds: number
  // Kilograms. weightKg is this session's effective load (a confirmed
  // progression override applied); authoredWeightKg is the template's fixed
  // default and the regression floor.
  weightKg?: number
  authoredWeightKg?: number
  order: number
}

export type SessionPlan = {
  id: string
  templateId: string
  templateVersion: number
  packId: string
  ruleVersion: string
  createdAt: string
  exercises: SessionPlanExercise[]
  adaptations: AdaptationDecision[]
  reproducibilityHash: string
  // The weekly goal in effect when this workout started (absent on plans
  // from before 2026-10-03). The first workout of a week fixes that week's
  // goal for every derived reward (domain/progress/weekGoals.ts).
  weeklyGoal?: number
  // The Start screen's length dial (domain/session/lengthDial.ts), already
  // baked into `exercises`. Absent means usual (and on every older plan).
  length?: WorkoutLength
}

export type SessionEventType =
  | 'SESSION_STARTED'
  | 'SET_COMPLETED'
  | 'REST_ENDED'
  // payload.byMs: pushes the persisted restEndsAt forward, so an extended
  // rest survives refresh/reopen like every other piece of session state.
  | 'REST_EXTENDED'
  | 'REST_SKIPPED'
  | 'PAUSED'
  | 'RESUMED'
  | 'SESSION_COMPLETED'
  | 'SESSION_COMPLETED_SHORTENED'
  // Starts the countdown of a timed set (a hold); its end is derived from
  // this timestamp and the plan's timeSeconds, so a refresh keeps the clock.
  | 'HOLD_STARTED'
  // Leaves the rest of the current move undone and moves to the next one.
  | 'EXERCISE_SKIPPED'
  // Takes back the set that started the current rest (a mis-tap): back to
  // ACTIVE on that same set. The undone SET_COMPLETED stays stored but
  // never counts (appliedEvents.ts).
  | 'SET_UNDONE'

export type SessionEvent = {
  // Dexie-assigned auto-increment primary key (src/infrastructure/db/schema.ts).
  // Optional because pure domain code (the reducer, tests) constructs events
  // without one; the persistence layer assigns it on insert and it becomes
  // the true insertion-order tiebreaker for replay, since two events can
  // share the same millisecond `timestamp`.
  seq?: number
  eventId: string
  sessionId: string
  type: SessionEventType
  timestamp: string
  payload: Record<string, unknown>
}

export type SessionStatus =
  | 'DRAFT'
  | 'READY'
  | 'ACTIVE'
  | 'RESTING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'COMPLETED_SHORTENED'

export type SessionState = {
  status: SessionStatus
  currentExerciseIndex: number
  currentSetNumber: number
  restStartedAt: string | null
  restEndsAt: string | null
  // When the current timed set's countdown began (HOLD_STARTED), or null.
  holdStartedAt: string | null
  // When the session was paused, so RESUMED can push the running clocks
  // (rest, hold) forward by the time spent paused.
  pausedAt: string | null
  // Where the set that started the current rest was done, so SET_UNDONE can
  // go back to it. Only set while that rest is still running (or paused).
  lastSet: { exerciseIndex: number; setNumber: number } | null
  appliedEventIds: string[]
}

export type SessionResult = {
  sessionId: string
  planId: string
  status: 'COMPLETED' | 'COMPLETED_SHORTENED'
  startedAt: string
  endedAt: string
  totalSetsCompleted: number
  totalSetsPlanned: number
}
