import { db } from '../schema'
import type { RewardRecord } from '../schema'
import { newId } from '../../../shared/id'

// Hubby Bunny's reward-shop catalog. Only he (PIN-gated in the UI) adds,
// edits or removes rewards; both profiles on a device can read the active
// list to shop.

// Settings key for the id -> deletedAt tombstone map, same pattern as
// customTemplateRepository.ts's 'deletedRoutines': a reward removed here
// must stay removed even if an older backup (one from before the delete)
// is imported later.
export const DELETED_REWARDS_KEY = 'deletedRewards'

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

// Records the deletion (settings 'deletedRewards', id -> deletedAt) so an
// older backup imported later can't bring the reward back.
export async function removeReward(id: string, at: string = new Date().toISOString()): Promise<void> {
  await db.transaction('rw', db.rewards, db.settings, async () => {
    await db.rewards.delete(id)
    const marks = ((await db.settings.get(DELETED_REWARDS_KEY))?.value ?? {}) as Record<string, string>
    await db.settings.put({ key: DELETED_REWARDS_KEY, value: { ...marks, [id]: at } })
  })
}
