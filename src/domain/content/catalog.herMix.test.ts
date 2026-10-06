import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../infrastructure/db/schema'
import { setHeart } from '../../infrastructure/db/repositories/favoritesRepository'
import { getTemplate, listAllTemplates } from './catalog'

beforeEach(async () => {
  await db.favorites.clear()
})

describe('catalog: Her mix', () => {
  it('resolves her-mix only while three shown moves are hearted', async () => {
    await setHeart('fs.bodyweight-squat', true, new Date(2026, 9, 6, 1))
    await setHeart('fs.plank', true, new Date(2026, 9, 6, 2))
    expect(await getTemplate('her-mix')).toBeUndefined()
    expect((await listAllTemplates()).herMix).toBeNull()

    await setHeart('fs.dead-bug', true, new Date(2026, 9, 6, 3))
    expect((await getTemplate('her-mix'))?.exercises.map((e) => e.exerciseId)).toEqual([
      'fs.bodyweight-squat',
      'fs.plank',
      'fs.dead-bug',
    ])
    expect((await listAllTemplates()).herMix?.id).toBe('her-mix')

    await setHeart('fs.plank', false, new Date(2026, 9, 6, 4))
    expect(await getTemplate('her-mix')).toBeUndefined()
  })
})
