import type { SessionEvent, SessionPlan, SessionResult } from '../session/types'
import { fullBodyA } from '../content/fixtures/foundationStrengthStarter'
import { projectSetRecords } from './history'
import { sessionHighlights } from './sessionHighlights'

// Achievements celebrate effort, never absence: nothing expires, nothing is
// lost by resting, and "welcome back" is a warm unlock, not a lapse. Each is
// earned once, on the first finished session that qualifies, and is derived
// from history every time (no stored unlock state to drift or import).

export type AchievementIcon =
  | 'sprout'
  | 'flower'
  | 'bouquet'
  | 'tree'
  | 'calendar'
  | 'target'
  | 'sun'
  | 'moon'
  | 'star'
  | 'heart'
  | 'compass'
  | 'hourglass'
  | 'door'
  | 'flame'
  | 'trophy'
  | 'medal'

export type AchievementDef = {
  id: string
  title: string
  // How it's earned, phrased as an invitation (shown on locked badges too).
  description: string
  icon: AchievementIcon
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: 'first-workout', title: 'First bloom', description: 'Finish your first workout.', icon: 'sprout' },
  { id: 'full-set', title: 'Full set', description: 'Finish every planned set in a workout.', icon: 'star' },
  { id: 'three-in-a-week', title: 'Three in a week', description: 'Finish three workouts in one week.', icon: 'calendar' },
  { id: 'weekly-goal', title: 'Goal getter', description: "Meet your week's workout goal.", icon: 'target' },
  { id: 'workouts-5', title: 'Five strong', description: 'Finish five workouts.', icon: 'flower' },
  { id: 'workouts-10', title: 'Ten and growing', description: 'Finish ten workouts.', icon: 'bouquet' },
  { id: 'workouts-25', title: 'Quarter century', description: 'Finish twenty-five workouts.', icon: 'tree' },
  { id: 'workouts-50', title: 'Fifty blooms', description: 'Finish fifty workouts.', icon: 'trophy' },
  { id: 'early-bird', title: 'Early bird', description: 'Finish a workout before 8 in the morning.', icon: 'sun' },
  { id: 'night-owl', title: 'Night owl', description: 'Finish a workout after 9 at night.', icon: 'moon' },
  {
    id: 'full-body-a-complete',
    title: 'Full-Body explorer',
    description: 'Do every move in Full-Body A at least once.',
    icon: 'compass',
  },
  { id: 'ten-moves', title: 'Curious mover', description: 'Try ten different moves.', icon: 'heart' },
  { id: 'hold-strong', title: 'Hold strong', description: 'Hold for a minute in total in one workout.', icon: 'hourglass' },
  { id: 'welcome-back', title: 'Welcome back', description: 'Come back for a workout after a week or more away.', icon: 'door' },
  { id: 'warmed-up', title: 'Warmed up', description: 'Do the warm-up and a workout on the same day.', icon: 'flame' },
  { id: 'new-best', title: 'New best', description: 'Beat one of your own bests.', icon: 'medal' },
]

export type AchievementHistory = {
  plans: readonly SessionPlan[]
  results: readonly SessionResult[]
  events: readonly SessionEvent[]
}

export type EvaluatedAchievement = AchievementDef & {
  unlockedAt: string | null
  sessionId: string | null
}

const WORKOUT_COUNTS: Record<string, number> = { 'workouts-5': 5, 'workouts-10': 10, 'workouts-25': 25, 'workouts-50': 50 }
const WARM_UP_ID = 'draft.warm-up'
const BOOKEND_IDS = new Set([WARM_UP_ID, 'draft.cool-down'])
const AWAY_MS = 7 * 24 * 60 * 60 * 1000
const HOLD_SECONDS = 60

export function evaluateAchievements(history: AchievementHistory, weeklyGoal: number): EvaluatedAchievement[] {
  const planById = new Map(history.plans.map((p) => [p.id, p]))
  const results = [...history.results].sort((a, b) => a.endedAt.localeCompare(b.endedAt))
  const records = projectSetRecords(history.plans, results, history.events)
  const recordsBySession = new Map<string, typeof records>()
  for (const r of records) recordsBySession.set(r.sessionId, [...(recordsBySession.get(r.sessionId) ?? []), r])

  const earned = new Map<string, { unlockedAt: string; sessionId: string }>()
  const earn = (id: string, result: SessionResult) => {
    if (!earned.has(id)) earned.set(id, { unlockedAt: result.endedAt, sessionId: result.sessionId })
  }

  const fullBodyAMoves = new Set(fullBodyA.exercises.map((e) => e.exerciseId))
  const movesSeen = new Set<string>()
  const weekCounts = new Map<string, number>()
  const dayTemplates = new Map<string, Set<string>>()
  let previousEnd: number | null = null

  results.forEach((result, index) => {
    const ended = new Date(result.endedAt)
    const plan = planById.get(result.planId)
    const sessionRecords = recordsBySession.get(result.sessionId) ?? []

    earn('first-workout', result)
    for (const [id, count] of Object.entries(WORKOUT_COUNTS)) if (index + 1 === count) earn(id, result)

    if (result.status === 'COMPLETED' && result.totalSetsPlanned > 0 && result.totalSetsCompleted >= result.totalSetsPlanned) {
      earn('full-set', result)
    }

    const week = weekKey(ended)
    const inWeek = (weekCounts.get(week) ?? 0) + 1
    weekCounts.set(week, inWeek)
    if (inWeek >= 3) earn('three-in-a-week', result)
    if (inWeek >= weeklyGoal) earn('weekly-goal', result)

    const hour = ended.getHours()
    if (hour < 8) earn('early-bird', result)
    if (hour >= 21) earn('night-owl', result)

    for (const r of sessionRecords) movesSeen.add(r.exerciseId)
    if ([...fullBodyAMoves].every((id) => movesSeen.has(id))) earn('full-body-a-complete', result)
    if (movesSeen.size >= 10) earn('ten-moves', result)

    const heldSeconds = sessionRecords.reduce((sum, r) => sum + (r.prescribedSeconds ?? 0), 0)
    if (heldSeconds >= HOLD_SECONDS) earn('hold-strong', result)

    if (previousEnd !== null && ended.getTime() - previousEnd >= AWAY_MS) earn('welcome-back', result)
    previousEnd = ended.getTime()

    if (plan) {
      const day = dayKey(ended)
      const templates = dayTemplates.get(day) ?? new Set<string>()
      templates.add(plan.templateId)
      dayTemplates.set(day, templates)
      const mainWorkout = [...templates].some((t) => !BOOKEND_IDS.has(t))
      if (templates.has(WARM_UP_ID) && mainWorkout) earn('warmed-up', result)
    }

    if (sessionHighlights(records, results, result.sessionId).newBests.length > 0) earn('new-best', result)
  })

  return ACHIEVEMENTS.map((def) => {
    const hit = earned.get(def.id)
    return { ...def, unlockedAt: hit?.unlockedAt ?? null, sessionId: hit?.sessionId ?? null }
  })
}

// The achievements a just-finished session earned, for the Complete screen.
export function newlyUnlocked(evaluated: readonly EvaluatedAchievement[], sessionId: string): EvaluatedAchievement[] {
  return evaluated.filter((a) => a.sessionId === sessionId)
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

// Local Monday of the week, matching the weekly streak.
function weekKey(date: Date): string {
  const day = date.getDay()
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() + (day === 0 ? -6 : 1 - day))
  return dayKey(monday)
}
