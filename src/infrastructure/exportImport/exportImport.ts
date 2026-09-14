import { db } from '../db/schema'
import type { CheckInRecord, FamiliarityRecord, ProgressionRecord, SettingsRecord } from '../db/schema'
import type { SessionEvent, SessionPlan, SessionResult } from '../../domain/session/types'

export type ExportBundle = {
  exportedAt: string
  version: number
  settings: SettingsRecord[]
  checkIns: CheckInRecord[]
  sessionPlans: SessionPlan[]
  sessionEvents: SessionEvent[]
  sessionResults: SessionResult[]
  familiarity: FamiliarityRecord[]
  progression: ProgressionRecord[]
}

export async function exportAll(): Promise<ExportBundle> {
  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    settings: await db.settings.toArray(),
    checkIns: await db.checkIns.toArray(),
    sessionPlans: await db.sessionPlans.toArray(),
    sessionEvents: await db.sessionEvents.toArray(),
    sessionResults: await db.sessionResults.toArray(),
    familiarity: await db.familiarity.toArray(),
    progression: await db.progression.toArray(),
  }
}

export async function importAll(bundle: ExportBundle): Promise<void> {
  if (bundle.version !== 1) {
    throw new Error(`Unsupported export bundle version: ${bundle.version}`)
  }
  await db.transaction(
    'rw',
    [db.settings, db.checkIns, db.sessionPlans, db.sessionEvents, db.sessionResults, db.familiarity, db.progression],
    async () => {
      await db.settings.bulkPut(bundle.settings)
      await db.checkIns.bulkPut(bundle.checkIns)
      await db.sessionPlans.bulkPut(bundle.sessionPlans)
      await db.sessionEvents.bulkPut(bundle.sessionEvents)
      await db.sessionResults.bulkPut(bundle.sessionResults)
      await db.familiarity.bulkPut(bundle.familiarity)
      await db.progression.bulkPut(bundle.progression)
    }
  )
}
