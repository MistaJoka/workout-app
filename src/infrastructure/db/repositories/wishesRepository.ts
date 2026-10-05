import { db } from '../schema'
import { newId } from '../../../shared/id'
import type { Wish, WishBook } from '../../../domain/rewards/wishes'

// Her wishlist lives in one settings row keyed by wish id (a WishBook), so it
// needs no schema version and merges on import as a union
// (exportImport.ts mergeSettings). Granting is derived (domain/rewards/wishes.ts).
export const WISHES_KEY = 'rewardsWishes'

export async function getWishBook(): Promise<WishBook> {
  return ((await db.settings.get(WISHES_KEY))?.value ?? {}) as WishBook
}

export async function addWish(input: { title: string; emoji: string; icon?: string }, at: string = new Date().toISOString()): Promise<Wish> {
  const wish: Wish = { id: newId(), title: input.title.trim(), emoji: input.emoji, ...(input.icon ? { icon: input.icon } : {}), createdAt: at }
  await db.transaction('rw', db.settings, async () => {
    const book = await getWishBook()
    await db.settings.put({ key: WISHES_KEY, value: { ...book, [wish.id]: wish } })
  })
  return wish
}

export async function dismissWish(id: string, at: string = new Date().toISOString()): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const book = await getWishBook()
    const wish = book[id]
    if (!wish || wish.dismissedAt) return
    await db.settings.put({ key: WISHES_KEY, value: { ...book, [id]: { ...wish, dismissedAt: at } } })
  })
}

// Union by id; a dismissal on either side sticks (like a tombstone).
export function mergeWishBooks(local: WishBook, incoming: WishBook): WishBook {
  const merged: WishBook = { ...incoming, ...local }
  for (const [id, wish] of Object.entries(incoming)) {
    const dismissedAt = merged[id].dismissedAt ?? wish.dismissedAt
    if (dismissedAt) merged[id] = { ...merged[id], dismissedAt }
  }
  return merged
}
