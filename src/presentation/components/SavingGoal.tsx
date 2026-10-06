import { RewardGlyph } from './RewardGlyph'
import { carrots } from '../units'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { RewardRecord } from '../../infrastructure/db/schema'
import { listRewards } from '../../infrastructure/db/repositories/rewardsRepository'
import { getSetting } from '../../infrastructure/db/repositories/settingsRepository'
import { rewardTier, savingProgress } from '../../domain/rewards/pricing'
import { RoadProgress } from './RoadProgress'
import { loadCarrotBalance } from './CarrotCelebration'
import { TodayTile } from './TodayTiles'

// "Saving for…": she pins one shop reward and watches her carrots fill a bar
// toward it (goal-gradient). Her whole balance counts, so the progress is
// real. Stored as the reward id; a removed or inactive reward simply hides.
export const SAVING_FOR_KEY = 'rewardsSavingFor'

export function savingGoalReward(rewards: readonly RewardRecord[], savingForId: string | null | undefined): RewardRecord | null {
  if (!savingForId) return null
  return rewards.find((r) => r.id === savingForId && r.active) ?? null
}

export function SavingGoalBar({ reward, balance }: { reward: RewardRecord; balance: number }) {
  const p = savingProgress(balance, reward.cost)
  const label = `Saving for ${reward.title}: ${p.have} of ${p.cost} carrots`
  return (
    <span className="block">
      {rewardTier(reward.cost) === 'mega' ? (
        <RoadProgress have={p.have} cost={p.cost} label={label} />
      ) : (
      <span
        role="progressbar"
        aria-label={`Saving for ${reward.title}: ${p.have} of ${p.cost} carrots`}
        aria-valuemin={0}
        aria-valuemax={p.cost}
        aria-valuenow={p.have}
        className="mt-1 block h-2 w-full overflow-hidden rounded-full bg-[var(--color-border)]"
      >
        <span
          className="block h-full rounded-full"
          style={{ width: `${p.pct}%`, background: 'linear-gradient(90deg, var(--color-primary), var(--color-accent))' }}
        />
      </span>
      )}
      <span className="hud-num block text-xs text-ink-muted">
        {carrots(p.have)}/{carrots(p.cost)} 🥕
        {p.ready ? ' · ready!' : ` · about ${p.workoutsLeft} ${p.workoutsLeft === 1 ? 'workout' : 'workouts'} to go`}
      </span>
    </span>
  )
}

// Today's compact card: only shows while she's saving for something.
// `tile` renders it as one of Today's square swipe tiles instead.
export function SavingGoalTodayCard({ tile = false }: { tile?: boolean } = {}) {
  const [state, setState] = useState<{ reward: RewardRecord; balance: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([listRewards(), getSetting<string>(SAVING_FOR_KEY), loadCarrotBalance()])
      .then(([rewards, savingFor, balance]) => {
        const reward = savingGoalReward(rewards, savingFor)
        if (!cancelled) setState(reward ? { reward, balance } : null)
      })
      .catch(() => {
        if (!cancelled) setState(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!state) return null
  if (tile) {
    const p = savingProgress(state.balance, state.reward.cost)
    return (
      <TodayTile
        to="/rewards"
        name={`Saving for ${state.reward.title}: ${p.have} of ${p.cost} carrots`}
        short={state.reward.title}
        art={<RewardGlyph emoji={state.reward.emoji} icon={state.reward.icon} size={44} />}
        value={`${carrots(p.have)}/${carrots(p.cost)}🥕`}
      />
    )
  }
  return (
    <Link to="/rewards" className="field-info flex min-h-11 items-center gap-3 px-4 py-3" data-testid="saving-goal-today">
      <RewardGlyph emoji={state.reward.emoji} icon={state.reward.icon} size={40} />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-ink-muted">Saving for</span>
        <span className="block truncate font-bold">{state.reward.title}</span>
        <SavingGoalBar reward={state.reward} balance={state.balance} />
      </span>
      <span aria-hidden="true" className="text-xl text-ink-muted">
        ›
      </span>
    </Link>
  )
}
