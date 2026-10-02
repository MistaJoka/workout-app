import { db } from '../schema'
import type { RedemptionRecord, RewardRecord } from '../schema'
import { newId } from '../../../shared/id'

// The spent side of the carrot ledger: redeeming is a real event (not a
// deterministic formula to replay, unlike earnedCarrots), so it lives here
// as its own row rather than being derived.

export async function redeemReward(
  reward: Pick<RewardRecord, 'id' | 'title' | 'cost'>,
  at: string = new Date().toISOString()
): Promise<RedemptionRecord> {
  const redemption: RedemptionRecord = {
    id: newId(),
    rewardId: reward.id,
    title: reward.title,
    cost: reward.cost,
    redeemedAt: at,
    deliveredAt: null,
  }
  await db.redemptions.add(redemption)
  return redemption
}

// Newest first, so a freshly redeemed coupon appears at the top of the list.
export async function listRedemptions(): Promise<RedemptionRecord[]> {
  return (await db.redemptions.orderBy('redeemedAt').toArray()).reverse()
}

export async function markDelivered(id: string, at: string = new Date().toISOString()): Promise<RedemptionRecord | undefined> {
  const existing = await db.redemptions.get(id)
  if (!existing || existing.deliveredAt) return existing
  const next: RedemptionRecord = { ...existing, deliveredAt: at }
  await db.redemptions.put(next)
  return next
}

// What's been spent so far: balance = earned (carrots.ts) - this.
export async function totalSpent(): Promise<number> {
  const all = await db.redemptions.toArray()
  return all.reduce((sum, r) => sum + r.cost, 0)
}
