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
import { activeProfile, type Profile } from '../profiles'

export type ExportBundle = {
  exportedAt: string
  version: number
  // Whose data this is. Absent from bundles made before 2026-09-28.
  profile?: Profile
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

const ALL_TABLES = () => [
  db.settings,
  db.checkIns,
  db.sessionPlans,
  db.sessionEvents,
  db.sessionResults,
  db.familiarity,
  db.progression,
  db.customTemplates,
  db.bodyWeight,
]

// One read transaction, so a write landing mid-export can't produce a
// backup whose tables disagree with each other.
export async function exportAll(): Promise<ExportBundle> {
  const { id, name } = activeProfile()
  return db.transaction('r', ALL_TABLES(), async () => ({
    exportedAt: new Date().toISOString(),
    version: 1,
    profile: { id, name },
    settings: await db.settings.toArray(),
    checkIns: await db.checkIns.toArray(),
    sessionPlans: await db.sessionPlans.toArray(),
    sessionEvents: await db.sessionEvents.toArray(),
    sessionResults: await db.sessionResults.toArray(),
    familiarity: await db.familiarity.toArray(),
    progression: await db.progression.toArray(),
    customTemplates: await db.customTemplates.toArray(),
    bodyWeight: await db.bodyWeight.toArray(),
  }))
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

// Settings that describe this device's profile, not the data in a backup.
const LOCAL_ONLY_SETTINGS = new Set(['lastExportAt'])

// Merges a backup into the active profile's data, in one transaction.
// History is append-only: plans, results, check-ins and events already here
// are never overwritten (events are matched by eventId; their auto-increment
// seq belongs to the device that made them and is reassigned on the way in).
// Current state (settings, progression, familiarity, routines, body weight)
// takes the backup's value.
export async function importAll(bundle: ExportBundle): Promise<void> {
  if (bundle.version !== 1) {
    throw new Error(`Unsupported export bundle version: ${bundle.version}`)
  }
  await db.transaction('rw', ALL_TABLES(), async () => {
    await db.settings.bulkPut(bundle.settings.filter((s) => !LOCAL_ONLY_SETTINGS.has(s.key)))
    await addMissing<CheckInRecord>(db.checkIns, bundle.checkIns, (r) => r.id)
    await addMissing<SessionPlan>(db.sessionPlans, bundle.sessionPlans, (r) => r.id)
    await addMissing<SessionResult>(db.sessionResults, bundle.sessionResults, (r) => r.sessionId)

    const incoming = [...bundle.sessionEvents].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
    const present = new Set(
      (await db.sessionEvents.where('eventId').anyOf(incoming.map((e) => e.eventId)).toArray()).map((e) => e.eventId)
    )
    const fresh = incoming
      .filter((e) => !present.has(e.eventId) && present.add(e.eventId))
      .map(({ seq: _seq, ...event }) => event)
    // bulkAdd keeps array order, so each session's events replay in the
    // order they happened.
    await db.sessionEvents.bulkAdd(fresh)

    await db.familiarity.bulkPut(bundle.familiarity)
    await db.progression.bulkPut(bundle.progression)
    if (bundle.customTemplates) {
      await db.customTemplates.bulkPut(bundle.customTemplates)
    }
    if (bundle.bodyWeight) {
      await db.bodyWeight.bulkPut(bundle.bodyWeight)
    }
  })
}

type AppendOnlyTable<T> = {
  bulkGet(keys: string[]): Promise<(T | undefined)[]>
  bulkAdd(items: T[]): Promise<unknown>
}

async function addMissing<T>(table: AppendOnlyTable<T>, rows: T[], keyOf: (row: T) => string): Promise<void> {
  const existing = await table.bulkGet(rows.map(keyOf))
  const missing = rows.filter((_, i) => existing[i] === undefined)
  // A backup can list the same row twice; add each key once.
  const seen = new Set<string>()
  await table.bulkAdd(missing.filter((r) => !seen.has(keyOf(r)) && seen.add(keyOf(r))))
}
