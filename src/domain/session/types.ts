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
  sets: number
  reps?: number
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
