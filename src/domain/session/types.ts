export type ReasonCode =
  | 'RETAINED'
  | 'REMOVED_OPTIONAL'
  | 'ADJUSTED_WITHIN_BOUNDS'
  | 'SUBSTITUTED_EQUIVALENT'
  | 'REGRESSED'
  | 'PROGRESSION_CANDIDATE'
  | 'SESSION_COMPRESSED'

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
}

export type SessionEventType =
  | 'SESSION_STARTED'
  | 'SET_COMPLETED'
  | 'REST_ENDED'
  | 'REST_SKIPPED'
  | 'PAUSED'
  | 'RESUMED'
  | 'SESSION_COMPLETED'
  | 'SESSION_COMPLETED_SHORTENED'

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
