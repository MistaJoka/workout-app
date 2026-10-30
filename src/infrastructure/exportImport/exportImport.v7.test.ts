import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/schema'
import { exportAll, importAll, parseExportBundle, type ExportBundle } from './exportImport'
import { deleteActivity, listLiveActivities, logActivity } from '../db/repositories/activitiesRepository'
import { clearMeasurements, listLiveMeasurements, saveMeasurements } from '../db/repositories/measurementsRepository'
import { deletePhoto, listLivePhotos, savePhoto } from '../db/repositories/photosRepository'
import { bytesToBase64 } from './photoCodec'

const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9])
const jpeg = () => new Blob([JPEG_BYTES], { type: 'image/jpeg' })
const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function bare(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    exportedAt: '2026-10-29T00:00:00.000Z',
    version: 1,
    settings: [],
    checkIns: [],
    sessionPlans: [],
    sessionEvents: [],
    sessionResults: [],
    familiarity: [],
    progression: [],
    ...over,
  }
}

// What a backup looks like after a trip through a file.
const viaFile = (bundle: ExportBundle) => JSON.parse(JSON.stringify(bundle))

beforeEach(async () => {
  await db.activities.clear()
  await db.bodyMeasurements.clear()
  await db.progressPhotos.clear()
})

describe('backup of activities, measurements and photos', () => {
  it('round-trips all three into an empty profile, photos as real image Blobs', async () => {
    await logActivity({ kind: 'swim', minutes: 40, day: today() })
    await saveMeasurements({ waistCm: 80, thighCm: 55 })
    await savePhoto({ blob: jpeg(), width: 4, height: 3, day: today() })

    const bundle = await exportAll()
    expect(bundle.progressPhotos?.[0].dataBase64).toBe(bytesToBase64(JPEG_BYTES))
    const parsed = parseExportBundle(viaFile(bundle))
    expect(parsed.ok).toBe(true)

    await db.activities.clear()
    await db.bodyMeasurements.clear()
    await db.progressPhotos.clear()
    if (parsed.ok) await importAll(parsed.bundle)

    expect(await listLiveActivities()).toEqual([expect.objectContaining({ kind: 'swim', minutes: 40 })])
    expect(await listLiveMeasurements()).toEqual([expect.objectContaining({ waistCm: 80, thighCm: 55 })])
    const [photo] = await listLivePhotos()
    expect(photo).toMatchObject({ width: 4, height: 3, mime: 'image/jpeg' })
    expect(new Uint8Array(await photo.blob!.arrayBuffer())).toEqual(JPEG_BYTES)
  })

  it('an older backup never revives a deleted activity, cleared measurements or a deleted photo', async () => {
    const activity = await logActivity({ kind: 'walk', minutes: 30, day: today() })
    await saveMeasurements({ chestCm: 90 }, new Date(Date.now() - 1000))
    const photo = await savePhoto({ blob: jpeg(), width: 1, height: 1, day: today() })
    const old = viaFile(await exportAll())

    await deleteActivity(activity.id)
    await clearMeasurements(today())
    await deletePhoto(photo.id)

    const parsed = parseExportBundle(old)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) await importAll(parsed.bundle)
    expect(await listLiveActivities()).toEqual([])
    expect(await listLiveMeasurements()).toEqual([])
    expect(await listLivePhotos()).toEqual([])
    expect((await db.progressPhotos.get(photo.id))?.blob).toBeUndefined()
  })

  it("a deletion in the backup removes the photo here, and the picture's data goes with it", async () => {
    const photo = await savePhoto({ blob: jpeg(), width: 1, height: 1, day: today() })
    await deletePhoto(photo.id)
    const withTombstone = viaFile(await exportAll())
    expect(withTombstone.progressPhotos[0].dataBase64).toBeUndefined()
    await db.progressPhotos.put({ ...photo })
    const parsed = parseExportBundle(withTombstone)
    if (parsed.ok) await importAll(parsed.bundle)
    expect(await listLivePhotos()).toEqual([])
  })

  it('a backup from before v7 (no activities, measurements or photos) imports cleanly', async () => {
    await logActivity({ kind: 'yoga', minutes: 20, day: today() })
    const parsed = parseExportBundle(bare())
    expect(parsed.ok).toBe(true)
    if (parsed.ok) await expect(importAll(parsed.bundle)).resolves.toEqual({ state: 'merged' })
    expect(await listLiveActivities()).toHaveLength(1)
  })

  it("another profile's backup never brings in their activities, measurements or photos", async () => {
    const theirs = bare({
      profile: { id: 'someone-else', name: 'Someone Else' },
      activities: [
        { id: 'x', kind: 'run', minutes: 30, day: today(), loggedAt: '2026-10-29T00:00:00.000Z', updatedAt: '2026-10-29T00:00:00.000Z', deletedAt: null },
      ],
      bodyMeasurements: [{ day: today(), recordedAt: '2030-01-01T00:00:00.000Z', waistCm: 70 }],
      progressPhotos: [
        { id: 'p', day: today(), takenAt: '2026-10-29T00:00:00.000Z', updatedAt: '2026-10-29T00:00:00.000Z', deletedAt: null, dataBase64: bytesToBase64(JPEG_BYTES) },
      ],
    })
    const parsed = parseExportBundle(theirs)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) await importAll(parsed.bundle)
    expect(await db.activities.count()).toBe(0)
    expect(await db.bodyMeasurements.count()).toBe(0)
    expect(await db.progressPhotos.count()).toBe(0)
  })

  it('rejects malformed rows before anything is written', () => {
    const svg = btoa('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>')
    const photo = { id: 'p', day: '2026-10-29', takenAt: 'x', updatedAt: 'x', deletedAt: null }
    expect(parseExportBundle(bare({ progressPhotos: [{ ...photo, dataBase64: svg }] })).ok).toBe(false)
    expect(parseExportBundle(bare({ progressPhotos: [{ ...photo, dataBase64: 'not base64 at all!!' }] })).ok).toBe(false)
    expect(parseExportBundle(bare({ progressPhotos: [photo] })).ok).toBe(false)
    expect(parseExportBundle(bare({ progressPhotos: [{ ...photo, deletedAt: 'x' }] })).ok).toBe(true)
    const act = { id: 'a', kind: 'walk', minutes: 30, day: '2026-10-29', loggedAt: 'x', updatedAt: 'x', deletedAt: null }
    expect(parseExportBundle(bare({ activities: [act] })).ok).toBe(true)
    expect(parseExportBundle(bare({ activities: [{ ...act, kind: 'nap' }] })).ok).toBe(false)
    expect(parseExportBundle(bare({ activities: [{ ...act, minutes: -5 }] })).ok).toBe(false)
    expect(parseExportBundle(bare({ bodyMeasurements: [{ day: '2026-10-29', recordedAt: 'x', waistCm: 9999 }] })).ok).toBe(false)
  })
})
