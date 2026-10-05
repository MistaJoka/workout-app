import { CARROT_RULES } from './carrots'
import { DEFAULT_WEEKLY_GOAL } from '../progress/stats'
// Shop pricing helpers: a carrot price told in workouts, a small / medium /
// big tier, and progress toward the one reward she's saving for. Pure.
//
// A full Foundation workout earns about 25 carrots (10 for finishing, ~10
// sets, 5 for perfect), so prices read in the unit she actually spends:
// workouts. Tiers keep the shop from flattening into all-cheap treats
// (R&D: docs/rnd/hubby-shop/REWARD_SYSTEMS_RND.md).

export const CARROTS_PER_WORKOUT = 25

// Mega: a dream that takes months of showing up (a road trip is ~1,000).
export const TIER_LIMITS = { medium: 40, big: 100, mega: 500 } as const

export type RewardTier = 'small' | 'medium' | 'big' | 'mega'

export function workoutsFor(cost: number): number {
  return Math.max(1, Math.round(cost / CARROTS_PER_WORKOUT))
}

export function rewardTier(cost: number): RewardTier {
  if (cost >= TIER_LIMITS.mega) return 'mega'
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

// A price told in weeks at her own pace (her weekly goal): "about 14
// weeks at 3 a week" for a mega prize.
export function weeksFor(cost: number, perWeek: number): number {
  return Math.ceil(workoutsFor(cost) / Math.max(1, perWeek))
}

// What a planned week is worth toward a goal: each workout plus the
// weekly-goal bonus. A week with nothing planned counts the default goal.
// `ready` instead of "~0 weeks" once the goal is already within reach.
export function weeklyForecast(days: number, remaining: number): { perWeek: number; weeks: number; ready: boolean } {
  const perWeek = (days > 0 ? days : DEFAULT_WEEKLY_GOAL) * CARROTS_PER_WORKOUT + CARROT_RULES.weeklyGoalBonus
  if (remaining <= 0) return { perWeek, weeks: 0, ready: true }
  return { perWeek, weeks: Math.ceil(remaining / perWeek), ready: false }
}

// Workouts still needed for the goal after spending `spend` on something
// else: the redeem sheet's neutral "N workouts to go after this". Null when
// nothing is spent.
export function workoutsToGoAfter(goal: { cost: number }, balance: number, spend: number): number | null {
  if (spend <= 0) return null
  const remaining = Math.max(0, goal.cost - (balance - spend))
  return Math.ceil(remaining / CARROTS_PER_WORKOUT)
}
