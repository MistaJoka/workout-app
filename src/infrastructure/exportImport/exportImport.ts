import { db } from '../db/schema'
import type {
  BodyWeightRecord,
  CheckInRecord,
  CustomTemplateRecord,
  FamiliarityRecord,
  ProgressionRecord,
  SettingsRecord,
} from '../db/schema'
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
  // Added with DB v2; absent from older bundles, which still import fine.
  customTemplates?: CustomTemplateRecord[]
  // Added with DB v3; optional for the same reason.
  bodyWeight?: BodyWeightRecord[]
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
    customTemplates: await db.customTemplates.toArray(),
    bodyWeight: await db.bodyWeight.toArray(),
  }
}

const EXPORT_BUNDLE_ARRAY_FIELDS = [
  'settings',
  'checkIns',
  'sessionPlans',
  'sessionEvents',
  'sessionResults',
  'familiarity',
  'progression',
] as const

export function isValidExportBundle(value: unknown): value is ExportBundle {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Record<string, unknown>
  if (typeof candidate.version !== 'number' || typeof candidate.exportedAt !== 'string') {
    return false
  }
  if (candidate.customTemplates !== undefined && !Array.isArray(candidate.customTemplates)) {
    return false
  }
  if (candidate.bodyWeight !== undefined && !Array.isArray(candidate.bodyWeight)) {
    return false
  }
  return EXPORT_BUNDLE_ARRAY_FIELDS.every((field) => Array.isArray(candidate[field]))
}

export async function importAll(bundle: ExportBundle): Promise<void> {
  if (bundle.version !== 1) {
    throw new Error(`Unsupported export bundle version: ${bundle.version}`)
  }
  await db.transaction(
    'rw',
    [
      db.settings,
      db.checkIns,
      db.sessionPlans,
      db.sessionEvents,
      db.sessionResults,
      db.familiarity,
      db.progression,
      db.customTemplates,
      db.bodyWeight,
    ],
    async () => {
      await db.settings.bulkPut(bundle.settings)
      await db.checkIns.bulkPut(bundle.checkIns)
      await db.sessionPlans.bulkPut(bundle.sessionPlans)
      await db.sessionEvents.bulkPut(bundle.sessionEvents)
      await db.sessionResults.bulkPut(bundle.sessionResults)
      await db.familiarity.bulkPut(bundle.familiarity)
      await db.progression.bulkPut(bundle.progression)
      if (bundle.customTemplates) {
        await db.customTemplates.bulkPut(bundle.customTemplates)
      }
      if (bundle.bodyWeight) {
        await db.bodyWeight.bulkPut(bundle.bodyWeight)
      }
    }
  )
}
