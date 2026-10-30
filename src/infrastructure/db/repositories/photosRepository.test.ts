import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../schema'
import { deletePhoto, getPhoto, listLivePhotos, listPhotos, savePhoto } from './photosRepository'

beforeEach(async () => {
  await db.progressPhotos.clear()
})

const jpeg = () => new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])], { type: 'image/jpeg' })

describe('photosRepository', () => {
  it('stores the picture as a Blob with its day and size', async () => {
    const saved = await savePhoto({ blob: jpeg(), width: 960, height: 1280, day: '2026-10-29' }, new Date(2026, 9, 29, 9))
    const row = await getPhoto(saved.id)
    expect(row).toMatchObject({ day: '2026-10-29', width: 960, height: 1280, mime: 'image/jpeg', deletedAt: null })
    expect(row?.blob).toBeInstanceOf(Blob)
    expect(row?.blob?.size).toBe(7)
  })

  it('lists newest day first', async () => {
    await savePhoto({ blob: jpeg(), width: 1, height: 1, day: '2026-10-01' })
    await savePhoto({ blob: jpeg(), width: 1, height: 1, day: '2026-10-20' })
    expect((await listLivePhotos()).map((p) => p.day)).toEqual(['2026-10-20', '2026-10-01'])
  })

  it('deleting drops the picture but keeps a tombstone', async () => {
    const saved = await savePhoto({ blob: jpeg(), width: 1, height: 1, day: '2026-10-29' })
    await deletePhoto(saved.id, new Date(2026, 9, 30))
    expect(await listLivePhotos()).toEqual([])
    const [row] = await listPhotos()
    expect(row.blob).toBeUndefined()
    expect(row.deletedAt).toBe(new Date(2026, 9, 30).toISOString())
  })
})
