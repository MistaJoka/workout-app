import { db } from '../db/schema'
import { mergeWishBooks, WISHES_KEY } from '../db/repositories/wishesRepository'
import type { WishBook } from '../../domain/rewards/wishes'
import type {
  ActivityRecord,
  BodyWeightRecord,
  MeasurementRecord,
  PhotoRecord,
  CheckInRecord,
  CustomTemplateRecord,
  FamiliarityRecord,
  LoveNoteRecord,
  FavoriteRecord,
  ProgressionRecord,
  RedemptionRecord,
  RewardRecord,
  SettingsRecord,
} from '../db/schema'
import type { SessionEvent, SessionPlan, SessionResult } from '../../domain/session/types'
import { activeProfile, adoptBackupProfile, type Profile } from '../profiles'
import { exportBundleSchema } from './bundleSchema'
import { base64ToBytes, blobToBase64 } from './photoCodec'
import { mergeActivity } from '../../domain/progress/activities'
import { mergePhoto, sniffImageMime, type PhotoMeta } from '../../domain/progress/photos'

// A progress photo as it travels in a backup: the stored row with its
// picture as base64 (tombstones carry no picture).
export type ExportedPhoto = PhotoMeta & { mime?: string; width?: number; height?: number; dataBase64?: string }

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
  // Added with DB v4 (Hubby Bunny's reward shop); optional for the same reason.
  rewards?: RewardRecord[]
  redemptions?: RedemptionRecord[]
  // Added with DB v5 (Hubby Bunny's surprise love notes); optional for the same reason.
  loveNotes?: LoveNoteRecord[]
  // Added with DB v6 (hearts); optional for the same reason.
  favorites?: FavoriteRecord[]
  // Added with DB v7 (2026-10-29); optional for the same reason. Photos make
  // a backup much larger than before.
  activities?: ActivityRecord[]
  bodyMeasurements?: MeasurementRecord[]
  progressPhotos?: ExportedPhoto[]
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
  db.rewards,
  db.redemptions,
  db.loveNotes,
  db.favorites,
  db.activities,
  db.bodyMeasurements,
  db.progressPhotos,
]

// One read transaction, so a write landing mid-export can't produce a
// backup whose tables disagree with each other. Photo pictures are turned
// into base64 after it closes (an await on a non-Dexie promise inside would
// end the transaction early); the Blobs stay readable after the commit.
export async function exportAll(): Promise<ExportBundle> {
  const { id, name, emblem } = activeProfile()
  const { photos, ...bundle } = await db.transaction('r', ALL_TABLES(), async () => ({
    exportedAt: new Date().toISOString(),
    version: 1,
    profile: { id, name, ...(emblem ? { emblem } : {}) },
    settings: await db.settings.toArray(),
    checkIns: await db.checkIns.toArray(),
    sessionPlans: await db.sessionPlans.toArray(),
    sessionEvents: await db.sessionEvents.toArray(),
    sessionResults: await db.sessionResults.toArray(),
    familiarity: await db.familiarity.toArray(),
    progression: await db.progression.toArray(),
    customTemplates: await db.customTemplates.toArray(),
    bodyWeight: await db.bodyWeight.toArray(),
    rewards: await db.rewards.toArray(),
    redemptions: await db.redemptions.toArray(),
    loveNotes: await db.loveNotes.toArray(),
    favorites: await db.favorites.toArray(),
    activities: await db.activities.toArray(),
    bodyMeasurements: await db.bodyMeasurements.toArray(),
    photos: await db.progressPhotos.toArray(),
  }))
  const progressPhotos: ExportedPhoto[] = []
  for (const photo of photos) progressPhotos.push(await exportPhoto(photo))
  return { ...bundle, progressPhotos }
}

async function exportPhoto({ blob, ...meta }: PhotoRecord): Promise<ExportedPhoto> {
  if (meta.deletedAt != null || !blob) {
    const { id, day, takenAt, updatedAt, deletedAt } = meta
    return { id, day, takenAt, updatedAt, deletedAt: deletedAt ?? updatedAt }
  }
  return { ...meta, dataBase64: await blobToBase64(blob) }
}

// A backup's photos as rows to store, decoded before any write. The bundle
// schema already checked each picture's first bytes; the full decode here
// sets the stored type from the bytes themselves, never from the file.
function importedPhotos(rows: ExportedPhoto[]): PhotoRecord[] {
  return rows.map(({ dataBase64, mime: _mime, ...meta }) => {
    if (meta.deletedAt != null || !dataBase64) {
      const { id, day, takenAt, updatedAt, deletedAt } = meta
      return { id, day, takenAt, updatedAt, deletedAt: deletedAt ?? updatedAt }
    }
    const bytes = base64ToBytes(dataBase64)
    const type = sniffImageMime(bytes)
    if (!type) throw new Error('Backup photo is not an image')
    return { ...meta, mime: type, blob: new Blob([bytes], { type }) }
  })
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

// Same idea for Hubby Bunny's reward catalog (written by removeReward).
export const DELETED_REWARDS_KEY = 'deletedRewards'

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
  // Decoded up front: inside the transaction only Dexie work may await.
  const photos = other ? [] : importedPhotos(bundle.progressPhotos ?? [])
  await db.transaction('rw', ALL_TABLES(), async () => {
    await addMissing<CheckInRecord>(db.checkIns, bundle.checkIns, (r) => r.id)
    await addMissing<SessionPlan>(db.sessionPlans, bundle.sessionPlans, (r) => r.id)
    await addMissing<SessionResult>(db.sessionResults, bundle.sessionResults, (r) => r.sessionId)
    // Redemptions are append-only history (a real event, like a finished
    // workout): added by id regardless of whose profile this backup is.
    await mergeRedemptions(bundle.redemptions ?? [])

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
    const deletedRoutines = ((await db.settings.get(DELETED_ROUTINES_KEY))?.value ?? {}) as Record<string, string>
    const deletedRewards = ((await db.settings.get(DELETED_REWARDS_KEY))?.value ?? {}) as Record<string, string>
    await putNewer<FamiliarityRecord>(db.familiarity, bundle.familiarity, (r) => r.exerciseId, (r) => r.lastSeenAt)
    await putNewer<ProgressionRecord>(db.progression, bundle.progression, (r) => r.exerciseId, (r) => r.lastAdvancedAt)
    await putNewer<CustomTemplateRecord>(
      db.customTemplates,
      (bundle.customTemplates ?? []).filter((r) => !(r.id in deletedRoutines)),
      (r) => r.id,
      (r) => r.updatedAt
    )
    await putNewer<BodyWeightRecord>(db.bodyWeight, bundle.bodyWeight ?? [], (r) => r.day, (r) => r.recordedAt)
    // Hearts carry their own tombstone (hearted: false), so newest-wins is
    // enough: an older backup can't revive a heart taken back here.
    await putNewer<FavoriteRecord>(db.favorites, bundle.favorites ?? [], (r) => r.exerciseId, (r) => r.updatedAt)
    // Hubby Bunny's shop catalog is current, mutable state like routines:
    // whichever copy was edited most recently wins, and a reward deleted
    // here stays deleted even if the incoming copy is newer.
    await putNewer<RewardRecord>(
      db.rewards,
      (bundle.rewards ?? []).filter((r) => !(r.id in deletedRewards)),
      (r) => r.id,
      (r) => r.updatedAt
    )
    // Love notes are the same kind of current, mutable state, but with one
    // more wrinkle: unlocked/read is itself real history (it happened on
    // some device), so it's never allowed to roll back even when the
    // *text* side of a merge keeps the local copy.
    await mergeLoveNotes(bundle.loveNotes ?? [])
    // Other activities, measurements and photos are this person's own body
    // and life, so another profile's backup never brings them in (above).
    // Activities: newest copy wins, a deletion on either side sticks.
    await mergeActivities(bundle.activities ?? [])
    // Measurements: one row per day, newest-wins like body weight; a
    // cleared day is itself a newer row, so it stays cleared.
    await putNewer<MeasurementRecord>(db.bodyMeasurements, bundle.bodyMeasurements ?? [], (r) => r.day, (r) => r.recordedAt)
    // Photos never change; only a deletion travels, and it always wins.
    await mergePhotos(photos)
  })
  // The profile's name and emblem live outside the database (profiles.ts);
  // a same-profile restore brings them back where this device has defaults.
  if (!other && bundle.profile) adoptBackupProfile(bundle.profile)
  return { state: other ? 'skipped-other-profile' : 'merged' }
}

// Settings carry no timestamp, so a key already set here keeps its local
// value; keys missing here are filled in. Deleted-routine/deleted-reward
// tombstone maps from both sides are unioned (a key deleted on either side
// stays deleted), never just one side kept.
const UNION_SETTINGS_KEYS = new Set([DELETED_ROUTINES_KEY, DELETED_REWARDS_KEY])

async function mergeSettings(rows: SettingsRecord[]): Promise<void> {
  const incoming = rows.filter((s) => !LOCAL_ONLY_SETTINGS.has(s.key))
  const local = await db.settings.bulkGet(incoming.map((s) => s.key))
  for (const [i, row] of incoming.entries()) {
    const here = local[i]
    if (here === undefined) {
      await db.settings.put(row)
    } else if (row.key === WISHES_KEY) {
      await db.settings.put({ key: row.key, value: mergeWishBooks(here.value as WishBook, row.value as WishBook) })
    } else if (UNION_SETTINGS_KEYS.has(row.key)) {
      await db.settings.put({ key: row.key, value: { ...(row.value as object), ...(here.value as object) } })
    }
  }
}

// Coupons are history (title/cost snapshot at redemption, never edited),
// but delivered and thanked happen later, possibly on another copy: like a
// love note's unlock, once either side has one it sticks, and an older
// backup can never undo it.
async function mergeRedemptions(rows: RedemptionRecord[]): Promise<void> {
  if (rows.length === 0) return
  const local = await db.redemptions.bulkGet(rows.map((r) => r.id))
  const writes: RedemptionRecord[] = []
  rows.forEach((incoming, i) => {
    const here = local[i]
    if (!here) {
      writes.push(incoming)
      return
    }
    const deliveredAt = here.deliveredAt ?? incoming.deliveredAt ?? null
    const thankedAt = here.thankedAt ?? incoming.thankedAt ?? null
    if (deliveredAt !== here.deliveredAt || thankedAt !== (here.thankedAt ?? null)) {
      writes.push({ ...here, deliveredAt, ...(thankedAt ? { thankedAt } : {}) })
    }
  })
  if (writes.length > 0) await db.redemptions.bulkPut(writes)
}

// Love notes merge like rewards (newest text wins by updatedAt), but
// unlocked/read are sticky on top of that: once either side has set one,
// the merged row keeps it, even if the side carrying the newer text/emoji
// is the one without it (Hubby Bunny's own phone, say, never runs the
// unlock roll for a note he wrote). The merged row's own updatedAt is the
// later of the two, so a future merge still compares correctly.
async function mergeLoveNotes(rows: LoveNoteRecord[]): Promise<void> {
  if (rows.length === 0) return
  const local = await db.loveNotes.bulkGet(rows.map((r) => r.id))
  const merged: LoveNoteRecord[] = rows.map((incoming, i) => {
    const here = local[i]
    if (!here) return incoming
    const newer = incoming.updatedAt >= here.updatedAt ? incoming : here
    const older = newer === incoming ? here : incoming
    return {
      ...newer,
      unlockedAt: newer.unlockedAt ?? older.unlockedAt,
      unlockedBySessionId: newer.unlockedBySessionId ?? older.unlockedBySessionId,
      readAt: newer.readAt ?? older.readAt,
      updatedAt: newer.updatedAt > older.updatedAt ? newer.updatedAt : older.updatedAt,
    }
  })
  await db.loveNotes.bulkPut(merged)
}

async function mergeActivities(rows: ActivityRecord[]): Promise<void> {
  if (rows.length === 0) return
  const merged = new Map<string, ActivityRecord>()
  const local = await db.activities.bulkGet(rows.map((r) => r.id))
  rows.forEach((incoming, i) => {
    merged.set(incoming.id, mergeActivity(merged.get(incoming.id) ?? local[i], incoming))
  })
  await db.activities.bulkPut([...merged.values()])
}

async function mergePhotos(rows: PhotoRecord[]): Promise<void> {
  if (rows.length === 0) return
  const local = await db.progressPhotos.bulkGet(rows.map((r) => r.id))
  const writes = new Map<string, PhotoRecord>()
  rows.forEach((incoming, i) => {
    const here = writes.get(incoming.id) ?? local[i]
    const action = mergePhoto(here, incoming)
    if (action === 'add') writes.set(incoming.id, incoming)
    if (action === 'delete') {
      const { id, day, takenAt, updatedAt, deletedAt } = incoming
      writes.set(id, { id, day, takenAt, updatedAt, deletedAt })
    }
  })
  if (writes.size > 0) await db.progressPhotos.bulkPut([...writes.values()])
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
