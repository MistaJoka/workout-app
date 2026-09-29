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
import { exportBundleSchema } from './bundleSchema'

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

export type ParseResult = { ok: true; bundle: ExportBundle } | { ok: false; problem: string }

// Checks every row of a backup before anything is written. The problem text
// names the first bad field for the log; the UI shows its own plain message.
export function parseExportBundle(value: unknown): ParseResult {
  const result = exportBundleSchema.safeParse(value)
  if (!result.success) {
    const issue = result.error.issues[0]
    return { ok: false, problem: `${issue.path.join('.') || 'file'}: ${issue.message}` }
  }
  return { ok: true, bundle: result.data as unknown as ExportBundle }
}

export function isValidExportBundle(value: unknown): value is ExportBundle {
  return parseExportBundle(value).ok
}

// Settings that describe this device's profile, not the data in a backup.
const LOCAL_ONLY_SETTINGS = new Set(['lastExportAt'])

// Routines deleted on this device, id -> deletedAt, so importing an older
// backup can't bring them back (written by deleteCustomTemplate).
export const DELETED_ROUTINES_KEY = 'deletedRoutines'

// 'merged': the same person (or a backup too old to say whose it is):
// history added, current state merged newest-wins. 'skipped-other-profile':
// someone else's backup: their workouts are added as history only, and this
// person's progression, routines, settings and body weight are left alone.
export type ImportSummary = { state: 'merged' | 'skipped-other-profile' }

export function isOtherProfile(bundle: Pick<ExportBundle, 'profile'>, activeId: string = activeProfile().id): boolean {
  return bundle.profile !== undefined && bundle.profile.id !== activeId
}

// Merges a backup into the active profile's data, in one transaction.
// History is append-only: plans, results, check-ins and events already here
// are never overwritten (events are matched by eventId; their auto-increment
// seq belongs to the device that made them and is reassigned on the way in).
// Current state never rolls back: each row keeps whichever copy is newer by
// its own timestamp, a row with no timestamp (settings) keeps the local
// value, and routines deleted here stay deleted.
export async function importAll(bundle: ExportBundle): Promise<ImportSummary> {
  if (bundle.version !== 1) {
    throw new Error(`Unsupported export bundle version: ${bundle.version}`)
  }
  const other = isOtherProfile(bundle)
  await db.transaction('rw', ALL_TABLES(), async () => {
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

    if (other) return

    await mergeSettings(bundle.settings)
    const deleted = ((await db.settings.get(DELETED_ROUTINES_KEY))?.value ?? {}) as Record<string, string>
    await putNewer<FamiliarityRecord>(db.familiarity, bundle.familiarity, (r) => r.exerciseId, (r) => r.lastSeenAt)
    await putNewer<ProgressionRecord>(db.progression, bundle.progression, (r) => r.exerciseId, (r) => r.lastAdvancedAt)
    await putNewer<CustomTemplateRecord>(
      db.customTemplates,
      (bundle.customTemplates ?? []).filter((r) => !(r.id in deleted)),
      (r) => r.id,
      (r) => r.updatedAt
    )
    await putNewer<BodyWeightRecord>(db.bodyWeight, bundle.bodyWeight ?? [], (r) => r.day, (r) => r.recordedAt)
  })
  return { state: other ? 'skipped-other-profile' : 'merged' }
}

// Settings carry no timestamp, so a key already set here keeps its local
// value; keys missing here are filled in. Deleted-routine markers from both
// sides are kept.
async function mergeSettings(rows: SettingsRecord[]): Promise<void> {
  const incoming = rows.filter((s) => !LOCAL_ONLY_SETTINGS.has(s.key))
  const local = await db.settings.bulkGet(incoming.map((s) => s.key))
  for (const [i, row] of incoming.entries()) {
    const here = local[i]
    if (here === undefined) {
      await db.settings.put(row)
    } else if (row.key === DELETED_ROUTINES_KEY) {
      await db.settings.put({ key: row.key, value: { ...(row.value as object), ...(here.value as object) } })
    }
  }
}

type StateTable<T> = {
  bulkGet(keys: string[]): Promise<(T | undefined)[]>
  bulkPut(items: T[]): Promise<unknown>
}

// Keeps whichever copy of each row is newer. A tie, or a local row at least
// as new, stays; rows missing here are added.
async function putNewer<T>(
  table: StateTable<T>,
  rows: T[],
  keyOf: (row: T) => string,
  stampOf: (row: T) => string | null
): Promise<void> {
  const local = await table.bulkGet(rows.map(keyOf))
  const newer = rows.filter((row, i) => {
    const here = local[i]
    if (here === undefined) return true
    return (stampOf(row) ?? '') > (stampOf(here) ?? '')
  })
  const seen = new Set<string>()
  await table.bulkPut(newer.filter((r) => !seen.has(keyOf(r)) && seen.add(keyOf(r))))
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
