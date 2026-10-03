import { db } from '../schema'
import type { RedemptionRecord, RewardRecord } from '../schema'
import { newId } from '../../../shared/id'
import { matchRedemptionsByCode } from '../../../domain/rewards/giftLink'

// The spent side of the carrot ledger: redeeming is a real event (not a
// deterministic formula to replay, unlike earnedCarrots), so it lives here
// as its own row rather than being derived.

// `id` is the idempotency key: the confirm sheet mints one per opening, so
// a double tap or a retry of the same confirm lands on the same row instead
// of spending twice (the first write wins; later ones return it).
export async function redeemReward(
  reward: Pick<RewardRecord, 'id' | 'title' | 'cost'>,
  at: string = new Date().toISOString(),
  id: string = newId()
): Promise<RedemptionRecord> {
  const redemption: RedemptionRecord = {
    id,
    rewardId: reward.id,
    title: reward.title,
    cost: reward.cost,
    redeemedAt: at,
    deliveredAt: null,
  }
  return db.transaction('rw', db.redemptions, async () => {
    const existing = await db.redemptions.get(id)
    if (existing) return existing
    await db.redemptions.add(redemption)
    return redemption
  })
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

// The gift-link "Mark delivered" round trip's write side (domain/rewards/
// giftLink.ts): marks every local redemption whose own short code is in
// `codes` as delivered. Already-delivered redemptions are left exactly as
// markDelivered leaves them (delivery time never moves); a code that
// matches nothing locally is simply ignored (the caller decides what to
// tell Hubby Bunny about that). Returns the matched redemptions, in their
// post-update state.
export async function markDeliveredByCode(codes: readonly string[], at: string = new Date().toISOString()): Promise<RedemptionRecord[]> {
  const matches = matchRedemptionsByCode(await db.redemptions.toArray(), codes)
  const updated: RedemptionRecord[] = []
  for (const match of matches) {
    updated.push((await markDelivered(match.id, at)) ?? match)
  }
  return updated
}
