// Shop pricing helpers: a carrot price told in workouts, a small / medium /
// big tier, and progress toward the one reward she's saving for. Pure.
//
// A full Foundation workout earns about 25 carrots (10 for finishing, ~10
// sets, 5 for perfect), so prices read in the unit she actually spends:
// workouts. Tiers keep the shop from flattening into all-cheap treats
// (R&D: docs/rnd/hubby-shop/REWARD_SYSTEMS_RND.md).

export const CARROTS_PER_WORKOUT = 25

export const TIER_LIMITS = { medium: 40, big: 100 } as const

export type RewardTier = 'small' | 'medium' | 'big'

export function workoutsFor(cost: number): number {
  return Math.max(1, Math.round(cost / CARROTS_PER_WORKOUT))
}

export function rewardTier(cost: number): RewardTier {
  if (cost >= TIER_LIMITS.big) return 'big'
  if (cost >= TIER_LIMITS.medium) return 'medium'
  return 'small'
}

export type SavingProgress = {
  have: number
  cost: number
  remaining: number
  pct: number
  ready: boolean
  workoutsLeft: number
}

// Her whole balance counts toward the goal: honest progress, nothing faked.
export function savingProgress(balance: number, cost: number): SavingProgress {
  const have = Math.max(0, Math.min(balance, cost))
  const remaining = Math.max(0, cost - have)
  return {
    have,
    cost,
    remaining,
    pct: cost > 0 ? Math.round((have / cost) * 100) : 100,
    ready: remaining === 0,
    workoutsLeft: remaining === 0 ? 0 : Math.ceil(remaining / CARROTS_PER_WORKOUT),
  }
}
