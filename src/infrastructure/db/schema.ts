import Dexie, { type EntityTable } from 'dexie'
import type { SessionEvent, SessionPlan, SessionResult } from '../../domain/session/types'

export type SettingsRecord = { key: string; value: unknown }
export type CheckInRecord = {
  id: string
  createdAt: string
  energy: number
  comfort: number
  availableMinutes: number
}
export type FamiliarityRecord = { exerciseId: string; exposureCount: number; lastSeenAt: string | null }
export type ProgressionRecord = { exerciseId: string; level: number; lastAdvancedAt: string | null }

export class WorkoutDb extends Dexie {
  settings!: EntityTable<SettingsRecord, 'key'>
  checkIns!: EntityTable<CheckInRecord, 'id'>
  sessionPlans!: EntityTable<SessionPlan, 'id'>
  sessionEvents!: EntityTable<SessionEvent, 'eventId'>
  sessionResults!: EntityTable<SessionResult, 'sessionId'>
  familiarity!: EntityTable<FamiliarityRecord, 'exerciseId'>
  progression!: EntityTable<ProgressionRecord, 'exerciseId'>

  constructor() {
    super('workout-app-v06')
    this.version(1).stores({
      settings: 'key',
      checkIns: 'id, createdAt',
      sessionPlans: 'id, templateId, createdAt',
      sessionEvents: 'eventId, sessionId, timestamp',
      sessionResults: 'sessionId, planId, endedAt',
      familiarity: 'exerciseId',
      progression: 'exerciseId',
    })
  }
}

export const db = new WorkoutDb()
