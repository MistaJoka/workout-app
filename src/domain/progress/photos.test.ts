import { describe, expect, it } from 'vitest'
import { PHOTO_MAX_EDGE, fitWithin, livePhotos, mergePhoto, photoDay, sniffImageMime, type PhotoMeta } from './photos'

function meta(over: Partial<PhotoMeta> = {}): PhotoMeta {
  return { id: 'p1', day: '2026-10-29', takenAt: '2026-10-29T12:00:00.000Z', updatedAt: '2026-10-29T12:00:00.000Z', deletedAt: null, ...over }
}

describe('fitWithin', () => {
  it('scales the long edge down to the max, keeping the aspect ratio', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: PHOTO_MAX_EDGE, height: 960 })
    expect(fitWithin(3000, 4000)).toEqual({ width: 960, height: PHOTO_MAX_EDGE })
  })

  it('never upscales a small picture and never returns 0', () => {
    expect(fitWithin(640, 480)).toEqual({ width: 640, height: 480 })
    expect(fitWithin(5000, 1)).toEqual({ width: PHOTO_MAX_EDGE, height: 1 })
  })
})

describe('photoDay', () => {
  const now = new Date(2026, 9, 29, 15)

  it("uses the file's own date for a gallery pick", () => {
    expect(photoDay(new Date(2026, 9, 1, 9).getTime(), now)).toBe('2026-10-01')
  })

  it('falls back to today for a missing, zero or future date', () => {
    expect(photoDay(undefined, now)).toBe('2026-10-29')
    expect(photoDay(0, now)).toBe('2026-10-29')
    expect(photoDay(new Date(2026, 10, 5).getTime(), now)).toBe('2026-10-29')
  })
})

describe('sniffImageMime', () => {
  it('recognizes JPEG, PNG and WebP by their bytes, nothing else', () => {
    expect(sniffImageMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg')
    expect(sniffImageMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png')
    expect(sniffImageMime(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe('image/webp')
    expect(sniffImageMime(new TextEncoder().encode('<svg onload=alert(1)>'))).toBeNull()
    expect(sniffImageMime(new Uint8Array([]))).toBeNull()
  })
})

describe('livePhotos', () => {
  it('drops deleted photos and sorts newest day first', () => {
    const list = livePhotos([
      meta({ id: 'a', day: '2026-10-01' }),
      meta({ id: 'b', day: '2026-10-20', deletedAt: '2026-10-21T00:00:00.000Z' }),
      meta({ id: 'c', day: '2026-10-28' }),
    ])
    expect(list.map((p) => p.id)).toEqual(['c', 'a'])
  })
})

describe('mergePhoto (backup import)', () => {
  it('adds a photo missing here', () => {
    expect(mergePhoto(undefined, meta())).toBe('add')
  })

  it('a deletion on either side wins; a live copy never revives a deleted one', () => {
    expect(mergePhoto(meta(), meta({ deletedAt: '2026-10-30T00:00:00.000Z' }))).toBe('delete')
    expect(mergePhoto(meta({ deletedAt: '2026-10-30T00:00:00.000Z' }), meta())).toBe('keep')
  })

  it('keeps the local copy of the same photo (photos never change)', () => {
    expect(mergePhoto(meta(), meta())).toBe('keep')
  })
})
