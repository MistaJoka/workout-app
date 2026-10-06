import { useEffect, useState } from 'react'
import { carrots } from '../units'
import { listRewards } from '../../infrastructure/db/repositories/rewardsRepository'
import { getSetting } from '../../infrastructure/db/repositories/settingsRepository'
import { rewardTier } from '../../domain/rewards/pricing'
import { loadCarrotBalance } from './CarrotCelebration'
import { RewardGlyph } from './RewardGlyph'
import { RoadProgress } from './RoadProgress'
import { goalGainView } from './goalGainView'
import { SAVING_FOR_KEY, savingGoalReward } from './SavingGoal'
import type { RewardRecord } from '../../infrastructure/db/schema'
import { useTheme } from '../theme/ThemeContext'
import { effectiveMotion, usePrefersReducedMotion } from './MovementMedia'

// Complete's payoff when she's saving for something: this workout's carrots
// flowing into that goal, "Road trip 340 → 365 / 1000". Renders nothing
// without a pinned goal or while it loads (Today/Complete never wait on a
// secondary widget). Under reduced/off motion it simply shows the end.
export function GoalGain({ gain }: { gain: number }) {
  const [goal, setGoal] = useState<{ reward: RewardRecord; before: number; after: number } | null>(null)
  const { motion } = useTheme()
  const reduced = usePrefersReducedMotion()
  const animate = effectiveMotion(motion, reduced) === 'full'
  const [shown, setShown] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([listRewards(), getSetting<string | null>(SAVING_FOR_KEY), loadCarrotBalance()])
      .then(([rewards, savingFor, balance]) => {
        const reward = savingGoalReward(rewards, savingFor)
        if (cancelled || !reward) return
        const after = Math.max(0, Math.min(balance, reward.cost))
        const before = Math.max(0, Math.min(balance - gain, reward.cost))
        setGoal({ reward, before, after })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [gain])

  useEffect(() => {
    if (!goal) return
    if (!animate) {
      setShown(goal.after)
      return
    }
    setShown(goal.before)
    const timer = window.setTimeout(() => setShown(goal.after), 450)
    return () => window.clearTimeout(timer)
  }, [goal, animate])

  if (!goal || shown == null) return null
  const { reward, before, after } = goal
  if (goalGainView(before, after, reward.cost).kind === 'ready') {
    return (
      <p className="flex items-center gap-2 text-sm font-bold" data-testid="goal-gain">
        <RewardGlyph emoji={reward.emoji} icon={reward.icon} size={28} />
        <span className="min-w-0 flex-1 truncate">{reward.title} · ready!</span>
      </p>
    )
  }
  const label = `Saving for ${reward.title}: ${after} of ${reward.cost} carrots, up from ${before}`
  return (
    <div className="space-y-1" data-testid="goal-gain">
      <p className="flex items-center gap-2 text-sm font-bold">
        <RewardGlyph emoji={reward.emoji} icon={reward.icon} size={28} />
        <span className="min-w-0 flex-1 truncate">{reward.title}</span>
        <span className="hud-num flex-none" aria-hidden="true">
          {carrots(before)} → {carrots(after)} / {carrots(reward.cost)}
        </span>
      </p>
      {rewardTier(reward.cost) === 'mega' ? (
        <RoadProgress have={shown} cost={reward.cost} label={label} />
      ) : (
        <span
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={reward.cost}
          aria-valuenow={after}
          className="block h-2 w-full overflow-hidden rounded-full bg-[var(--color-border)]"
        >
          <span
            className="block h-full rounded-full"
            style={{
              width: `${(shown / Math.max(1, reward.cost)) * 100}%`,
              background: 'linear-gradient(90deg, var(--color-primary), var(--color-accent))',
              transition: animate ? 'width 0.8s ease-out' : 'none',
            }}
          />
        </span>
      )}
    </div>
  )
}
