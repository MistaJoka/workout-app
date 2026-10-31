// Carrots and love notes from the finished sessions. Carrots are derived
// from history every time (domain/rewards/carrots.ts), never stored, so
// nothing here can drift from what actually happened.
import { loadHistoryWithGoals } from './progressSnapshot'
import { loadSessionHistory } from './historyIndex'
import { getWeeklySchedule } from '../infrastructure/db/repositories/scheduleRepository'
import { totalSpent } from '../infrastructure/db/repositories/redemptionsRepository'
import { loadWeekGoals } from '../infrastructure/db/repositories/weekGoalsRepository'
import {
  catchUpLoveNoteUnlocks,
  evaluateLoveNoteUnlockForSession,
  listLoveNotes,
} from '../infrastructure/db/repositories/loveNotesRepository'
import type { LoveNoteRecord } from '../infrastructure/db/schema'
import { GIVER_NAME, readSetting } from '../infrastructure/settingsKeys'
import { earnedCarrots, carrotsForSession, type SessionCarrots } from '../domain/rewards/carrots'
import { BOSS_ROSTER, bossDefeats } from '../domain/game/bosses'
import { bossCarrotSources, withBossCarrots } from '../domain/rewards/bossCarrots'
import { goalBloomForSession, goalBlooms } from '../domain/progress/goalBloom'

// Defeated weekly bosses pay a carrot bonus (domain/rewards/bossCarrots.ts).
function bossSources(history: Parameters<typeof bossDefeats>[0], goal: Parameters<typeof bossDefeats>[1]) {
  const names = new Map(BOSS_ROSTER.map((b) => [b.id, b.name]))
  return bossCarrotSources(bossDefeats(history, goal), (id) => names.get(id) ?? 'The boss')
}

// Every carrot earned so far (workouts, bonuses, defeated bosses). Only
// ever grows, which is what lets redeemReward check it against spending
// inside its own transaction.
export async function loadEarnedCarrots(): Promise<number> {
  const { history, goal } = await loadHistoryWithGoals()
  return earnedCarrots(history, goal, bossSources(history, goal)).total
}

export async function loadCarrotBalance(): Promise<number> {
  const [earned, spent] = await Promise.all([loadEarnedCarrots(), totalSpent()])
  return earned - spent
}

export async function loadSessionCarrots(sessionId: string): Promise<SessionCarrots | null> {
  const { history, goal } = await loadHistoryWithGoals()
  return withBossCarrots(carrotsForSession(history, goal, sessionId), bossSources(history, goal))
}

// This workout's surprise, if any: evaluates (idempotently) whether a
// locked note unlocks and returns it, alongside the giver's current name.
export async function loadLoveNoteUnlockForSession(
  sessionId: string
): Promise<{ note: LoveNoteRecord; giverName: string } | null> {
  const [{ results }, schedule, giverName] = await Promise.all([loadSessionHistory(), getWeeklySchedule(), readSetting(GIVER_NAME)])
  const goalMetThisSession = goalBloomForSession(results, await loadWeekGoals({ results, schedule }), sessionId) !== null
  const thisSessionEndedAt = results.find((r) => r.sessionId === sessionId)?.endedAt ?? new Date().toISOString()
  const note = await evaluateLoveNoteUnlockForSession(sessionId, {
    allSessionEndedAt: results.map((r) => r.endedAt),
    goalMetThisSession,
    thisSessionEndedAt,
  })
  return note ? { note, giverName } : null
}

export async function loadUnreadLoveNote(): Promise<LoveNoteRecord | null> {
  const notes = await listLoveNotes()
  return notes.find((n) => n.unlockedAt && !n.readAt) ?? null
}

// Workouts that never reached Complete (auto-finished, or the app closed
// first) get their chance at a note here, then any unread note shows.
export async function catchUpThenLoadUnread(): Promise<LoveNoteRecord | null> {
  try {
    // Nothing locked (the usual case): skip reading history at all.
    if (!(await listLoveNotes()).some((n) => n.unlockedAt === null)) return loadUnreadLoveNote()
    const [{ results }, schedule] = await Promise.all([loadSessionHistory(), getWeeklySchedule()])
    const goalSessions = new Set(goalBlooms(results, await loadWeekGoals({ results, schedule })).map((b) => b.sessionId))
    await catchUpLoveNoteUnlocks(results.map((r) => ({ sessionId: r.sessionId, endedAt: r.endedAt, goalMet: goalSessions.has(r.sessionId) })))
  } catch {
    // A failed catch-up never hides an unread note that's already there.
  }
  return loadUnreadLoveNote()
}

export async function loadLoveNotesSummary(): Promise<{ opened: number; total: number; sealed: number }> {
  const notes = await listLoveNotes()
  const opened = notes.filter((n) => n.unlockedAt).length
  return { opened, total: notes.length, sealed: notes.length - opened }
}
