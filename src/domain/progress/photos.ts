import { localDayKey } from './activities'

// Progress photos (owner decision 2026-10-29): taken or picked on the
// phone, downscaled and re-encoded on the device (which also strips EXIF,
// including location), kept only in this profile's IndexedDB, and leaving
// the device only inside a backup the person saves herself. Photos never
// change once saved; deleting one leaves a tombstone (no picture data) so
// importing an older backup can't bring it back. Pure.

export const PHOTO_MAX_EDGE = 1280
export const PHOTO_JPEG_QUALITY = 0.8
export const PHOTO_MIME = 'image/jpeg'

export type PhotoMeta = {
  id: string
  // Local calendar day the photo is for (what the gallery and compare show).
  day: string
  // When it was added to the app.
  takenAt: string
  updatedAt: string
  deletedAt: string | null
}

// Scale so the long edge is at most `maxEdge`; never upscale.
export function fitWithin(width: number, height: number, maxEdge = PHOTO_MAX_EDGE): { width: number; height: number } {
  const long = Math.max(width, height)
  if (long <= maxEdge) return { width, height }
  const scale = maxEdge / long
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

// The day a photo is for: the file's own date when it has a believable one
// (a picture picked from the gallery keeps the day it was taken), else today.
// Re-encoding drops EXIF, so the file's last-modified time is all there is.
export function photoDay(lastModified: number | undefined, now: Date): string {
  if (!lastModified || !Number.isFinite(lastModified) || lastModified > now.getTime()) return localDayKey(now)
  return localDayKey(new Date(lastModified))
}

// What an imported picture really is, by its first bytes. Anything that
// isn't a plain JPEG/PNG/WebP raster (an SVG with script, say) is refused.
export function sniffImageMime(bytes: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (bytes.length >= 8 && png.every((b, i) => bytes[i] === b)) return 'image/png'
  const riff = [0x52, 0x49, 0x46, 0x46]
  const webp = [0x57, 0x45, 0x42, 0x50]
  if (bytes.length >= 12 && riff.every((b, i) => bytes[i] === b) && webp.every((b, i) => bytes[8 + i] === b)) {
    return 'image/webp'
  }
  return null
}

export function livePhotos<T extends PhotoMeta>(photos: readonly T[]): T[] {
  return photos
    .filter((p) => p.deletedAt == null)
    .sort((a, b) => b.day.localeCompare(a.day) || b.takenAt.localeCompare(a.takenAt))
}

// Backup merge for one photo id. Photos are immutable, so the only
// question is whether either side deleted it.
export function mergePhoto(local: PhotoMeta | undefined, incoming: PhotoMeta): 'add' | 'delete' | 'keep' {
  if (!local) return 'add'
  if (local.deletedAt == null && incoming.deletedAt != null) return 'delete'
  return 'keep'
}
