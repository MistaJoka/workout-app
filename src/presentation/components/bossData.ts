// Shared read path for the weekly boss fight: every caller (Today's card,
// the Boss screen, the Complete screen's hit reward) derives the same
// BossState/BossDefeat[] from the same history read, the same way
// loadAchievements() does for badges.

import { bossDefeats, bossState, pastBossWeeks, type BossDefeat, type BossHistory, type BossState, type BossWeekSummary } from '../../domain/game/bosses'
import { getAllSessionHistory } from '../../infrastructure/db/repositories/sessionRepository'
import { getWeeklySchedule } from '../../infrastructure/db/repositories/scheduleRepository'
import { weeklyGoal } from '../../domain/progress/stats'

async function loadHistoryAndGoal(): Promise<{ history: BossHistory; goal: number }> {
  const [history, schedule] = await Promise.all([getAllSessionHistory(), getWeeklySchedule()])
  return { history, goal: weeklyGoal(schedule) }
}

export async function loadBossState(now: Date): Promise<BossState> {
  const { history, goal } = await loadHistoryAndGoal()
  return bossState(history, goal, now)
}

export async function loadBossDefeats(): Promise<BossDefeat[]> {
  const { history, goal } = await loadHistoryAndGoal()
  return bossDefeats(history, goal)
}

export async function loadPastBossWeeks(now: Date): Promise<BossWeekSummary[]> {
  const { history, goal } = await loadHistoryAndGoal()
  return pastBossWeeks(history, goal, now)
}
