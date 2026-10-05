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
// Thrown when the balance (earned minus everything already spent, read
// inside the redeem's own transaction) can't cover the reward.
export class NotEnoughCarrotsError extends Error {
  constructor() {
    super('Not enough carrots')
    this.name = 'NotEnoughCarrotsError'
  }
}

// `earned`: carrots earned so far (derived from history by the caller).
// Earned only ever grows, so a value read just before is safe; what's
// spent is re-read inside the same write transaction, and IndexedDB runs
// write transactions on one table one at a time, so two redeems at once
// (two tabs, a stale screen) can never both spend the same carrots.
// Without `earned` the balance isn't checked (callers that already
// settled the price, e.g. tests and imports).
export async function redeemReward(
  reward: Pick<RewardRecord, 'id' | 'title' | 'cost'>,
  at: string = new Date().toISOString(),
  id: string = newId(),
  { earned }: { earned?: number } = {}
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
    if (earned != null) {
      let spent = 0
      await db.redemptions.each((r) => {
        spent += r.cost
      })
      if (earned - spent < reward.cost) throw new NotEnoughCarrotsError()
    }
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

// First thank-you wins; later taps leave the time alone.
export async function markThanked(id: string, at: string = new Date().toISOString()): Promise<void> {
  await db.transaction('rw', db.redemptions, async () => {
    const existing = await db.redemptions.get(id)
    if (!existing || existing.thankedAt) return
    await db.redemptions.put({ ...existing, thankedAt: at })
  })
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
