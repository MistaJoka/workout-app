// What the finished sessions add up to -- XP and level, the next goal, the
// weekly boss, this workout's goal bloom -- derived from history on every
// read and never stored, so none of it can drift from what happened. Screens
// call these instead of folding history themselves.
import { loadSessionHistory, type SessionHistory } from './historyIndex'
import { getWeeklySchedule } from '../infrastructure/db/repositories/scheduleRepository'
import { getEventsForSession, getPlan, getResult, listResults } from '../infrastructure/db/repositories/sessionRepository'
import { loadWeekGoals } from '../infrastructure/db/repositories/weekGoalsRepository'
import { computeXp, levelFor, sessionXpGain, type LevelInfo, type SessionXpGain } from '../domain/progress/xp'
import { nextGoal } from '../domain/progress/nextGoal'
import { evaluateAchievements, visibleAchievements } from '../domain/progress/achievements'
import { completeStats, type CompleteStats } from '../domain/session/completeStats'
import { goalBloomForSession } from '../domain/progress/goalBloom'
import type { GardenSpecies } from '../domain/progress/garden'
import { bossDefeats, bossState, pastBossWeeks, type BossDefeat, type BossState, type BossWeekSummary } from '../domain/game/bosses'

// The history snapshot plus the per-week goal resolver every derived reward
// scores against (one shared read of both).
export async function loadHistoryWithGoals(): Promise<{ history: SessionHistory; goal: (dateInWeek: Date) => number }> {
  const [history, schedule] = await Promise.all([loadSessionHistory(), getWeeklySchedule()])
  return { history, goal: await loadWeekGoals({ ...history, schedule }) }
}

export async function loadSessionXp(sessionId: string): Promise<SessionXpGain> {
  const { history, goal } = await loadHistoryWithGoals()
  return sessionXpGain(history, goal, sessionId)
}

export async function loadLevel(): Promise<LevelInfo> {
  const { history, goal } = await loadHistoryWithGoals()
  return levelFor(computeXp(history, goal).total)
}

// The steady goal (milestone, level, next badge tier) this history leaves
// closest, as the line "Next up" shows, or null when there is none.
export async function loadNextUpLabel(): Promise<string | null> {
  const { history, goal } = await loadHistoryWithGoals()
  const totalXp = computeXp(history, goal).total
  // Only each ladder's next tier, so it never points past the next step.
  const badges = visibleAchievements(evaluateAchievements(history, goal)).filter((a) => !a.unlockedAt)
  return nextGoal(history.results.length, totalXp, badges)?.label ?? null
}

// The bonus bloom this workout earned by reaching its week's goal, if any.
export async function loadGoalBloom(sessionId: string): Promise<GardenSpecies | null> {
  const results = await listResults()
  return goalBloomForSession(results, await loadWeekGoals({ results }), sessionId)?.species ?? null
}

export async function loadBossState(now: Date): Promise<BossState> {
  const { history, goal } = await loadHistoryWithGoals()
  return bossState(history, goal, now)
}

export async function loadBossDefeats(): Promise<BossDefeat[]> {
  const { history, goal } = await loadHistoryWithGoals()
  return bossDefeats(history, goal)
}

export async function loadPastBossWeeks(now: Date): Promise<BossWeekSummary[]> {
  const { history, goal } = await loadHistoryWithGoals()
  return pastBossWeeks(history, goal, now)
}

// The finish screen's three numbers, or null when the plan or result is gone.
export async function loadCompleteStats(sessionId: string): Promise<CompleteStats | null> {
  const [plan, result, events] = await Promise.all([getPlan(sessionId), getResult(sessionId), getEventsForSession(sessionId)])
  return plan && result ? completeStats(plan, result, events) : null
}
