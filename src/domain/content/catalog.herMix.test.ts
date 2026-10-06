import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as favorites from '../../infrastructure/db/repositories/favoritesRepository'
import { db } from '../../infrastructure/db/schema'
import { setHeart } from '../../infrastructure/db/repositories/favoritesRepository'
import { getTemplate, getTemplateName, listAllTemplates } from './catalog'

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

describe('catalog: template names for history', () => {
  it('names a her-mix session "Her mix" even after the mix is gone', async () => {
    expect(await getTemplate('her-mix')).toBeUndefined()
    expect(await getTemplateName('her-mix')).toBe('Her mix')
    expect(await getTemplateName('fs.full-body-a')).toBe('Full-Body A')
    expect(await getTemplateName('no-such-routine')).toBeUndefined()
  })
})

describe('catalog: Her mix failures stay contained', () => {
  it('listAllTemplates still resolves when building the mix fails', async () => {
    const spy = vi.spyOn(favorites, 'listHearts').mockRejectedValueOnce(new Error('chunk gone'))
    const all = await listAllTemplates()
    expect(all.herMix).toBeNull()
    expect(all.curated.length).toBeGreaterThan(0)
    spy.mockRestore()
  })
})
