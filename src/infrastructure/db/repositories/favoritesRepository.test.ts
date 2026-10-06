import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../schema'
import { isHearted, listHearts, setHeart } from './favoritesRepository'

beforeEach(async () => {
  await db.favorites.clear()
})

describe('favoritesRepository', () => {
  it('hearts and un-hearts a move, keeping a tombstone', async () => {
    await setHeart('fs.plank', true, new Date(2026, 9, 6, 10))
    expect(await isHearted('fs.plank')).toBe(true)
    await setHeart('fs.plank', false, new Date(2026, 9, 6, 11))
    expect(await isHearted('fs.plank')).toBe(false)
    expect(await db.favorites.get('fs.plank')).toMatchObject({ hearted: false })
  })

  it('lists only hearted moves', async () => {
    await setHeart('fs.plank', true)
    await setHeart('fs.dead-bug', true)
    await setHeart('fs.dead-bug', false)
    expect((await listHearts()).map((h) => h.exerciseId)).toEqual(['fs.plank'])
  })
})
