import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../schema'
import { addWish, dismissWish, getWishBook, mergeWishBooks, WISHES_KEY } from './wishesRepository'

beforeEach(async () => {
  await db.settings.delete(WISHES_KEY)
})

describe('wishesRepository', () => {
  it('adds a wish with a trimmed title and keeps it by id', async () => {
    const wish = await addWish({ title: '  Spa day ', emoji: '🛁' }, '2026-10-03T10:00:00.000Z')
    expect(wish).toMatchObject({ title: 'Spa day', emoji: '🛁', createdAt: '2026-10-03T10:00:00.000Z' })
    expect(await getWishBook()).toEqual({ [wish.id]: wish })
  })

  it('dismissing keeps the wish but marks it, once', async () => {
    const wish = await addWish({ title: 'Spa day', emoji: '🛁' })
    await dismissWish(wish.id, '2026-10-04T00:00:00.000Z')
    await dismissWish(wish.id, '2026-10-05T00:00:00.000Z')
    expect((await getWishBook())[wish.id].dismissedAt).toBe('2026-10-04T00:00:00.000Z')
  })
})

describe('mergeWishBooks (backup import)', () => {
  it('unions by id, and a dismissal on either side sticks', () => {
    const a = { id: 'a', title: 'A', emoji: '🍕', createdAt: '2026-10-01T00:00:00.000Z' }
    const b = { id: 'b', title: 'B', emoji: '🛁', createdAt: '2026-10-02T00:00:00.000Z' }
    const merged = mergeWishBooks({ a, b }, { a: { ...a, dismissedAt: '2026-10-03T00:00:00.000Z' } })
    expect(Object.keys(merged).sort()).toEqual(['a', 'b'])
    expect(merged.a.dismissedAt).toBe('2026-10-03T00:00:00.000Z')
    expect(mergeWishBooks({ a: { ...a, dismissedAt: 'x' } }, { a }).a.dismissedAt).toBe('x')
  })
})
