import { db, type PhotoRecord } from '../schema'
import { newId } from '../../../shared/id'
import { PHOTO_MIME, livePhotos } from '../../../domain/progress/photos'

// Saves an already re-encoded picture (infrastructure/photoEncoding.ts).
export async function savePhoto(
  input: { blob: Blob; width: number; height: number; day: string },
  now: Date = new Date()
): Promise<PhotoRecord> {
  const at = now.toISOString()
  const record: PhotoRecord = {
    id: newId(),
    day: input.day,
    takenAt: at,
    updatedAt: at,
    deletedAt: null,
    blob: input.blob,
    mime: input.blob.type || PHOTO_MIME,
    width: input.width,
    height: input.height,
  }
  await db.progressPhotos.add(record)
  return record
}

export async function getPhoto(id: string): Promise<PhotoRecord | undefined> {
  return db.progressPhotos.get(id)
}

// Every row, tombstones included (backups carry them).
export async function listPhotos(): Promise<PhotoRecord[]> {
  return db.progressPhotos.toArray()
}

export async function listLivePhotos(): Promise<PhotoRecord[]> {
  return livePhotos(await listPhotos())
}

// Removes the picture itself; the row stays as a tombstone so an older
// backup can't bring the photo back.
export async function deletePhoto(id: string, now: Date = new Date()): Promise<void> {
  const row = await db.progressPhotos.get(id)
  if (!row) return
  const at = now.toISOString()
  await db.progressPhotos.put({ id, day: row.day, takenAt: row.takenAt, updatedAt: at, deletedAt: at })
}
