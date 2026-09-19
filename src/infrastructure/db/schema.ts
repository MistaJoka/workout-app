import Dexie, { type EntityTable } from 'dexie'
import type { SessionEvent, SessionPlan, SessionResult } from '../../domain/session/types'
import type { WorkoutTemplate } from '../../domain/content/types'

export type CustomTemplateRecord = WorkoutTemplate & { createdAt: string; updatedAt: string }
// One entry per local calendar day (id = YYYY-MM-DD); kilograms internally.
export type BodyWeightRecord = { day: string; kg: number; recordedAt: string }

export type SettingsRecord = { key: string; value: unknown }
export type CheckInRecord = {
  id: string
  createdAt: string
  energy: number
  comfort: number
  availableMinutes: number
}
export type FamiliarityRecord = { exerciseId: string; exposureCount: number; lastSeenAt: string | null }
export type ProgressionRecord = {
  exerciseId: string
  level: number
  lastAdvancedAt: string | null
  // Reps-based prescription override once progressed past the authored
  // template default; null means "use the template's authored value".
  currentPrescribedReps: number | null
  // Kilograms; null means "use the template's authored load". Only
  // meaningful for weight-capable exercises.
  currentWeightKg: number | null
  consecutiveFailureStreak: number
  // Set by applyProgressionOutcome when the deterministic engine proposes a
  // PROGRESSION_CANDIDATE; cleared by advanceProgression (confirm) or
  // dismissProgressionCandidate (not yet). Never applied automatically.
  pendingCandidate: { candidatePrescribedReps: number; candidateWeightKg?: number; detail: string } | null
}

export class WorkoutDb extends Dexie {
  settings!: EntityTable<SettingsRecord, 'key'>
  checkIns!: EntityTable<CheckInRecord, 'id'>
  sessionPlans!: EntityTable<SessionPlan, 'id'>
  sessionEvents!: EntityTable<SessionEvent, 'seq'>
  sessionResults!: EntityTable<SessionResult, 'sessionId'>
  familiarity!: EntityTable<FamiliarityRecord, 'exerciseId'>
  progression!: EntityTable<ProgressionRecord, 'exerciseId'>
  customTemplates!: EntityTable<CustomTemplateRecord, 'id'>
  bodyWeight!: EntityTable<BodyWeightRecord, 'day'>

  constructor() {
    super('workout-app-v06')
    this.version(1).stores({
      settings: 'key',
      checkIns: 'id, createdAt',
      sessionPlans: 'id, templateId, createdAt',
      sessionEvents: '++seq, &eventId, sessionId, timestamp',
      sessionResults: 'sessionId, planId, endedAt',
      familiarity: 'exerciseId',
      progression: 'exerciseId',
    })
    // v2: user-built routines. Additive only — existing stores untouched.
    this.version(2).stores({
      customTemplates: 'id, updatedAt',
    })
    // v3: body-weight log. Additive only.
    this.version(3).stores({
      bodyWeight: 'day',
    })
  }
}

export const db = new WorkoutDb()
