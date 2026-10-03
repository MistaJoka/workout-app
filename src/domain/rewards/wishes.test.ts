import { describe, expect, it } from 'vitest'
import { grantedWishIds, pendingWishes, type WishBook } from './wishes'

const book: WishBook = {
  w2: { id: 'w2', title: 'Spa day', emoji: '🛁', createdAt: '2026-10-02T10:00:00.000Z' },
  w1: { id: 'w1', title: 'Pizza night', emoji: '🍕', createdAt: '2026-10-01T10:00:00.000Z' },
  w3: { id: 'w3', title: 'Concert', emoji: '🎮', createdAt: '2026-10-03T10:00:00.000Z', dismissedAt: '2026-10-03T11:00:00.000Z' },
}

describe('wishes', () => {
  it('pending = not dismissed and not yet a reward, oldest first', () => {
    expect(pendingWishes(book, new Set()).map((w) => w.id)).toEqual(['w1', 'w2'])
  })

  it('a reward carrying the wish id grants it (no separate state to keep in sync)', () => {
    expect(pendingWishes(book, new Set(['w1'])).map((w) => w.id)).toEqual(['w2'])
    expect(grantedWishIds(book, new Set(['w1', 'other']))).toEqual(new Set(['w1']))
  })

  it('an empty or missing book has nothing pending', () => {
    expect(pendingWishes(undefined, new Set())).toEqual([])
    expect(pendingWishes({}, new Set())).toEqual([])
  })
})
