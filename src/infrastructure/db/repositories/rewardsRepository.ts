import { db } from '../schema'
import type { RewardRecord } from '../schema'
import { newId } from '../../../shared/id'

// Hubby Bunny's reward-shop catalog. Only he (PIN-gated in the UI) adds,
// edits or removes rewards; both profiles on a device can read the active
// list to shop.

export async function listRewards(): Promise<RewardRecord[]> {
  return db.rewards.orderBy('createdAt').toArray()
}

export async function listActiveRewards(): Promise<RewardRecord[]> {
  return (await listRewards()).filter((r) => r.active)
}

export async function addReward(
  input: { title: string; cost: number; emoji: string },
  at: string = new Date().toISOString()
): Promise<RewardRecord> {
  const reward: RewardRecord = {
    id: newId(),
    title: input.title.trim(),
    cost: Math.max(0, Math.round(input.cost)),
    emoji: input.emoji,
    active: true,
    createdAt: at,
    updatedAt: at,
  }
  await db.rewards.put(reward)
  return reward
}

export async function updateReward(
  id: string,
  patch: Partial<Pick<RewardRecord, 'title' | 'cost' | 'emoji' | 'active'>>,
  at: string = new Date().toISOString()
): Promise<RewardRecord | undefined> {
  const existing = await db.rewards.get(id)
  if (!existing) return undefined
  const next: RewardRecord = {
    ...existing,
    ...patch,
    ...(patch.title != null ? { title: patch.title.trim() } : {}),
    ...(patch.cost != null ? { cost: Math.max(0, Math.round(patch.cost)) } : {}),
    updatedAt: at,
  }
  await db.rewards.put(next)
  return next
}

export async function removeReward(id: string): Promise<void> {
  await db.rewards.delete(id)
}
