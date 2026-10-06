import { db } from '../schema'
import type { Heart } from '../../../domain/content/herMix'

export async function setHeart(exerciseId: string, hearted: boolean, at: Date = new Date()): Promise<void> {
  await db.favorites.put({ exerciseId, hearted, updatedAt: at.toISOString() })
}

export async function isHearted(exerciseId: string): Promise<boolean> {
  return (await db.favorites.get(exerciseId))?.hearted === true
}

export async function listHearts(): Promise<Heart[]> {
  const rows = await db.favorites.toArray()
  return rows.filter((r) => r.hearted).map(({ exerciseId, updatedAt }) => ({ exerciseId, updatedAt }))
}
